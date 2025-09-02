import{r,a as N}from"./vendor-react-CyT1AhbS.js";import{m as L}from"./vendor-maps-C78ko_py.js";const T=r.memo(({map:b,location:o,busInfo:h,isConnected:l,onMarkerClick:i,isClustered:e=!1,clusterCount:t=1})=>{const{busId:v,latitude:p,longitude:n,speed:a,eta:m}=o,{busNumber:c,driverName:f,routeName:g}=h,$=r.useMemo(()=>{const s=document.createElement("div");return e&&t>1?(s.className="bus-cluster-marker",s.innerHTML=`
        <div class="bus-cluster-pin">
          <div class="bus-cluster-icon">🚌</div>
          <div class="bus-cluster-count">${t}</div>
          <div class="bus-cluster-pulse"></div>
        </div>
      `):(s.className="bus-marker",s.innerHTML=`
        <div class="bus-marker-pin">
          <div class="bus-marker-icon">🚌</div>
          <div class="bus-marker-pulse"></div>
        </div>
        <div class="bus-marker-content">
          <div class="bus-number">${c}</div>
          <div class="bus-speed">${a?`${a} km/h`:"N/A"}</div>
          <div class="bus-eta">${m?`ETA: ${m.estimated_arrival_minutes} min`:"ETA: N/A"}</div>
        </div>
      `),s},[c,a,m,e,t]),d=r.useMemo(()=>e&&t>1?`
        <div class="bus-cluster-popup">
          <div class="bus-cluster-popup-header">
            <h3>🚌 Bus Cluster</h3>
            <div class="bus-cluster-count">${t} buses</div>
          </div>
          <div class="bus-cluster-popup-content">
            <p>Click to expand and view individual buses</p>
          </div>
        </div>
      `:`
      <div class="bus-popup">
        <div class="bus-popup-header">
          <h3>🚌 Bus ${c}</h3>
          <div class="bus-status ${l?"online":"offline"}">
            ${l?"🟢 Online":"🔴 Offline"}
          </div>
        </div>
        <div class="bus-popup-content">
          <div class="bus-info">
            <p><strong>Driver:</strong> ${f||"N/A"}</p>
            <p><strong>Route:</strong> ${g||"N/A"}</p>
            <p><strong>Speed:</strong> ${a?`${a} km/h`:"N/A"}</p>
            <p><strong>Last Update:</strong> ${new Date(o.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    `,[c,f,g,a,o.timestamp,l,e,t]),k=r.useCallback(()=>{i&&i(v)},[i,v]),u=r.useMemo(()=>{const s=new L.Marker({element:$,anchor:"center"}).setLngLat([n,p]).addTo(b),E=new L.Popup({offset:25,className:e?"bus-cluster-popup-container":"bus-popup-container",closeButton:!0,closeOnClick:!1}).setHTML(d);return s.setPopup(E),i&&s.getElement().addEventListener("click",k),s},[b,n,p,$,d,v,i,e,k]);return N.useEffect(()=>{u.setLngLat([n,p]),u.getPopup().setHTML(d)},[n,p,d,u]),N.useEffect(()=>()=>{u&&u.remove()},[u]),null});T.displayName="BusMarker";export{T as default};
//# sourceMappingURL=BusMarker-CrDKL-TA.js.map
