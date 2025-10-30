let puppeteer;
try { puppeteer = require('puppeteer'); }
catch { try { puppeteer = require('../node_modules/puppeteer'); } catch { try { puppeteer = require('../frontend/node_modules/puppeteer'); } catch {} } }
const fs = require('fs');
const path = require('path');

async function run() {
  const report = { steps: [], errors: [], screenshots: [], created: {}, timestamps: {} };
  const screenshotDir = path.join(__dirname, '..', 'login-test-screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const addShot = async (page, name, desc = '') => {
    const filename = `${name}_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    const filepath = path.join(screenshotDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    report.screenshots.push({ name, desc, filepath });
  };

  let browser;
  try {
    browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1440, height: 900 }, args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => report.steps.push({ type: 'console', level: msg.type(), text: msg.text(), time: new Date().toISOString() }));
    page.on('response', res => { if (!res.ok()) report.errors.push({ type: 'network', status: res.status(), url: res.url(), time: new Date().toISOString() }); });

    // 1) Login to admin
    await page.goto('http://localhost:5173/admin-login', { waitUntil: 'networkidle2', timeout: 60000 });
    await addShot(page, 'admin_login_page');
    await page.type('input[name="email"]', 'tirthraval27@gmail.com');
    await page.type('input[name="password"]', 'Tirth Raval27');
    await addShot(page, 'admin_login_filled');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
    ]);
    await addShot(page, 'admin_after_login');

    // 2) Extract Supabase access token from localStorage
    const token = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.includes('auth-token') || k.includes('sb-') && k.includes('auth')) {
          try {
            const obj = JSON.parse(localStorage.getItem(k) || '{}');
            if (obj?.access_token) return obj.access_token;
            if (obj?.currentSession?.access_token) return obj.currentSession.access_token;
            if (obj?.data?.session?.access_token) return obj.data.session.access_token;
          } catch {}
        }
      }
      return null;
    });
    if (!token) throw new Error('Failed to obtain admin access token from localStorage');
    report.steps.push({ type: 'info', text: 'Admin token acquired', time: new Date().toISOString() });

    const callAdmin = async (method, pathUrl, body) => {
      const res = await page.evaluate(async ({ method, pathUrl, body, token }) => {
        const resp = await fetch(`http://localhost:3000/admin${pathUrl}`, {
          method,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: body ? JSON.stringify(body) : undefined
        });
        const json = await resp.json().catch(() => ({}));
        return { ok: resp.ok, status: resp.status, json };
      }, { method, pathUrl, body, token });
      if (!res.ok) throw new Error(`${method} /admin${pathUrl} failed: ${res.status} ${JSON.stringify(res.json)}`);
      return res.json?.data ?? res.json;
    };

    // 3) Create route
    const routeName = `E2E Route ${Date.now()}`;
    const route = await callAdmin('POST', '/routes', { name: routeName, is_active: true, origin: 'City A', destination: 'Ganpat University' });
    report.created.route = route?.id || route?.data?.id || route?.route?.id;
    report.steps.push({ type: 'create', entity: 'route', id: report.created.route, name: routeName });

    // 4) Add 7 stops (names only; location optional in API)
    for (let i = 1; i <= 7; i++) {
      const rs = await callAdmin('POST', '/route-stops', { route_id: report.created.route, name: `Stop ${i}` });
      report.steps.push({ type: 'create', entity: 'route_stop', id: rs?.id, sequence: i });
    }

    // 5) Create driver (also creates Supabase Auth account)
    const driverEmail = `e2e.driver.${Date.now()}@test.com`;
    const driverPassword = 'E2e#Driver123';
    const driver = await callAdmin('POST', '/drivers', {
      email: driverEmail,
      password: driverPassword,
      first_name: 'E2E',
      last_name: 'Driver',
      phone: '9999999999'
    });
    const driverId = driver?.id || driver?.data?.id || driver?.user?.id || driver?.profile?.id;
    report.created.driver = driverId;
    report.steps.push({ type: 'create', entity: 'driver', id: driverId, email: driverEmail });

    // 6) Create bus and assign route + driver
    const busNumber = `E2E-${Math.floor(Math.random()*900)+100}`;
    const bus = await callAdmin('POST', '/buses', {
      bus_number: busNumber,
      vehicle_no: `${busNumber}-VN`,
      capacity: 50,
      is_active: true,
      route_id: report.created.route,
      assigned_driver_profile_id: driverId
    });
    const busId = bus?.id || bus?.data?.id;
    report.created.bus = busId;
    report.steps.push({ type: 'create', entity: 'bus', id: busId, bus_number: busNumber });

    // 7) Create shift
    const shift = await callAdmin('POST', '/shifts', { name: `Morning ${Date.now()}`, start_time: '07:30:00', end_time: '11:30:00', description: 'E2E shift' });
    const shiftId = shift?.id || shift?.data?.id;
    report.created.shift = shiftId;
    report.steps.push({ type: 'create', entity: 'shift', id: shiftId });

    // 8) Open driver dashboard: login with created driver
    const driverPage = await browser.newPage();
    await driverPage.goto('http://localhost:5173/driver-login', { waitUntil: 'networkidle2', timeout: 60000 });
    await addShot(driverPage, 'driver_login_page');
    await driverPage.type('input[name="email"]', driverEmail);
    await driverPage.type('input[name="password"]', driverPassword);
    await addShot(driverPage, 'driver_login_filled');
    await Promise.all([
      driverPage.click('button[type="submit"]'),
      driverPage.waitForTimeout(4000)
    ]);
    await addShot(driverPage, 'driver_after_login');

    // Check stops visibility (basic): look for list items or markers
    await driverPage.waitForTimeout(3000);
    const stopsVisible = await driverPage.$$eval('*', nodes => nodes.some(n => (n.textContent||'').toLowerCase().includes('stop 1')));
    report.steps.push({ type: 'check', what: 'driver_stops_visible', result: stopsVisible });

    // Start tracking if a button exists
    const trackBtn = await driverPage.$('button:has-text("Start") , [data-testid*="track"], button:has-text("Track")');
    if (trackBtn) {
      await driverPage.click('button:has-text("Start"), [data-testid*="track"], button:has-text("Track")').catch(()=>{});
      await driverPage.waitForTimeout(3000);
      await addShot(driverPage, 'driver_tracking_started');
    }

    // 9) Open student map page and validate
    const studentPage = await browser.newPage();
    await studentPage.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 60000 });
    await addShot(studentPage, 'student_map_loaded');
    await studentPage.waitForTimeout(3000);
    const mapVisible = await studentPage.$$eval('canvas, [data-testid*="map"], [class*="map"]', els => els.length > 0);
    report.steps.push({ type: 'check', what: 'student_map_visible', result: mapVisible });

    // Try to trigger recentering action if control exists
    const recenterBtn = await studentPage.$('button:has-text("Center"), button:has-text("Recenter"), [data-testid*="center"]');
    if (recenterBtn) {
      await recenterBtn.click().catch(()=>{});
      await studentPage.waitForTimeout(1000);
      await addShot(studentPage, 'student_map_recentered');
      report.steps.push({ type: 'action', what: 'recenter_map', result: true });
    }

    // 10) Modify a stop name via admin API and check it appears on student page
    const routeStops = await callAdmin('GET', `/route-stops?routeId=${report.created.route}`);
    const firstStopId = (routeStops?.data?.[0]?.id) || (routeStops?.[0]?.id);
    if (firstStopId) {
      await callAdmin('PUT', `/route-stops/${firstStopId}`, { name: 'Stop 1 - Updated' });
      await studentPage.waitForTimeout(2000);
      const updatedVisible = await studentPage.$$eval('*', nodes => nodes.some(n => (n.textContent||'').toLowerCase().includes('stop 1 - updated')));
      report.steps.push({ type: 'check', what: 'student_stop_updated_live', result: updatedVisible });
      await addShot(studentPage, 'student_stop_updated');
    }

    // 11) Admin edit/delete pass (delete shift only to avoid breaking login)
    await callAdmin('PUT', `/buses/${report.created.bus}`, { capacity: 55 });
    report.steps.push({ type: 'edit', entity: 'bus', id: report.created.bus, changed: { capacity: 55 } });

    // 12) Finalize
    const outPath = path.join(__dirname, '..', 'e2e-system-check-report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`E2E report written: ${outPath}`);
  } catch (err) {
    console.error('E2E error:', err?.message || err);
  } finally {
    if (browser) await browser.close();
  }
}

if (require.main === module) {
  run();
}


