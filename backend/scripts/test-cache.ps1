# Cache Testing Script
# Tests the cache functionality of the backend server

param(
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "🧪 Cache Testing Script" -ForegroundColor Blue
Write-Host "======================" -ForegroundColor Blue

function Test-Server-Connection {
    Write-Host "🔍 Testing server connection..." -ForegroundColor Blue
    
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/health" -Method GET -Headers @{"Origin"=$BaseUrl} -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Server is running and accessible" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ Server is not accessible at $BaseUrl" -ForegroundColor Red
        Write-Host "💡 Make sure your backend server is running with: npm run dev" -ForegroundColor Yellow
        return $false
    }
}

function Test-Cache-Health {
    Write-Host "🔍 Testing cache health..." -ForegroundColor Blue
    
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/cache/health" -Method GET -Headers @{"Origin"=$BaseUrl} -TimeoutSec 5
        $data = $response.Content | ConvertFrom-Json
        
        if ($data.success) {
            $health = $data.data
            Write-Host "✅ Cache health check passed" -ForegroundColor Green
            Write-Host "   Connected: $($health.connected)" -ForegroundColor Cyan
            Write-Host "   Latency: $($health.latency)ms" -ForegroundColor Cyan
            Write-Host "   Cache Type: $($health.error)" -ForegroundColor Cyan
            
            if ($health.error -like "*in-memory*") {
                Write-Host "ℹ️ Using in-memory cache fallback (Redis not available)" -ForegroundColor Yellow
            } else {
                Write-Host "✅ Using Redis cache" -ForegroundColor Green
            }
            
            return $true
        } else {
            Write-Host "❌ Cache health check failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Failed to test cache health: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-Cache-Stats {
    Write-Host "🔍 Testing cache statistics..." -ForegroundColor Blue
    
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/cache/stats" -Method GET -Headers @{"Origin"=$BaseUrl} -TimeoutSec 5
        $data = $response.Content | ConvertFrom-Json
        
        if ($data.success) {
            $stats = $data.data.stats
            Write-Host "✅ Cache statistics retrieved" -ForegroundColor Green
            Write-Host "   Hits: $($stats.hits)" -ForegroundColor Cyan
            Write-Host "   Misses: $($stats.misses)" -ForegroundColor Cyan
            Write-Host "   Sets: $($stats.sets)" -ForegroundColor Cyan
            Write-Host "   Deletes: $($stats.deletes)" -ForegroundColor Cyan
            Write-Host "   Errors: $($stats.errors)" -ForegroundColor Cyan
            Write-Host "   Hit Rate: $($stats.hitRate)%" -ForegroundColor Cyan
            
            return $true
        } else {
            Write-Host "❌ Cache statistics check failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Failed to test cache stats: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-Cache-Operations {
    Write-Host "🔍 Testing cache operations..." -ForegroundColor Blue
    
    # Test cache set operation
    Write-Host "   Testing cache SET operation..." -ForegroundColor Blue
    try {
        $testData = @{
            key = "test-key-$(Get-Date -Format 'yyyyMMddHHmmss')"
            value = "test-value"
            ttl = 60
        }
        
        $body = $testData | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "$BaseUrl/cache/set" -Method POST -Headers @{"Origin"=$BaseUrl; "Content-Type"="application/json"} -Body $body -TimeoutSec 5
        
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Cache SET operation successful" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Cache SET operation failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "   ❌ Cache SET operation error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    # Test cache get operation
    Write-Host "   Testing cache GET operation..." -ForegroundColor Blue
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/cache/get/$($testData.key)" -Method GET -Headers @{"Origin"=$BaseUrl} -TimeoutSec 5
        
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Cache GET operation successful" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Cache GET operation failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "   ❌ Cache GET operation error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    return $true
}

function Test-Cache-Clear {
    Write-Host "🔍 Testing cache clear operation..." -ForegroundColor Blue
    
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/cache/clear" -Method POST -Headers @{"Origin"=$BaseUrl} -TimeoutSec 5
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Cache clear operation successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Cache clear operation failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Cache clear operation error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "🚀 Starting cache tests..." -ForegroundColor Blue
Write-Host ""

$tests = @(
    @{Name="Server Connection"; Function={Test-Server-Connection}},
    @{Name="Cache Health"; Function={Test-Cache-Health}},
    @{Name="Cache Statistics"; Function={Test-Cache-Stats}},
    @{Name="Cache Operations"; Function={Test-Cache-Operations}},
    @{Name="Cache Clear"; Function={Test-Cache-Clear}}
)

$passedTests = 0
$totalTests = $tests.Count

foreach ($test in $tests) {
    Write-Host "🧪 Running test: $($test.Name)" -ForegroundColor Blue
    $result = & $test.Function
    
    if ($result) {
        $passedTests++
        Write-Host "✅ $($test.Name) - PASSED" -ForegroundColor Green
    } else {
        Write-Host "❌ $($test.Name) - FAILED" -ForegroundColor Red
    }
    Write-Host ""
}

# Summary
Write-Host "📊 Test Results Summary" -ForegroundColor Blue
Write-Host "=====================" -ForegroundColor Blue
Write-Host "Passed: $passedTests/$totalTests" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })

if ($passedTests -eq $totalTests) {
    Write-Host "🎉 All cache tests passed! Your cache system is working correctly." -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Cache endpoints available:" -ForegroundColor Blue
    Write-Host "   GET  $BaseUrl/cache/health  - Check cache health" -ForegroundColor Cyan
    Write-Host "   GET  $BaseUrl/cache/stats   - View cache statistics" -ForegroundColor Cyan
    Write-Host "   POST $BaseUrl/cache/clear   - Clear cache" -ForegroundColor Cyan
} else {
    Write-Host "⚠️ Some tests failed. Check the error messages above." -ForegroundColor Yellow
    Write-Host "💡 Make sure your backend server is running and accessible." -ForegroundColor Blue
}

Write-Host ""
Write-Host "🔧 To install Redis for better performance:" -ForegroundColor Blue
Write-Host "   .\scripts\install-redis.ps1" -ForegroundColor Cyan
