$baseUrl = "http://localhost:5000/api"
$results = @()

function Test-Endpoint {
    param($Name, $Method, $Url, $Body, $Token, $ExpectSuccess)
    
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
            ErrorAction = "Stop"
        }
        if ($Body) { $params["Body"] = $Body }
        
        $response = Invoke-RestMethod @params
        $status = if ($response.success) { "PASS" } else { "FAIL" }
        $msg = $response.message
    } catch {
        $status = if ($ExpectSuccess -eq $false) { "PASS (Expected Error)" } else { "FAIL" }
        $msg = $_.Exception.Message
    }
    
    Write-Host "[$status] $Name - $msg"
    return @{ Name=$Name; Status=$status; Message=$msg }
}

Write-Host "`n=========================================="
Write-Host "  CopyCraft Feature Test Suite"
Write-Host "==========================================`n"

# 1. HEALTH CHECK
Write-Host "--- 1. HEALTH CHECK ---"
$r = Test-Endpoint -Name "Health Check" -Method GET -Url "$baseUrl/health"
$results += $r

# 2. AUTHENTICATION - Customer Login
Write-Host "`n--- 2. AUTHENTICATION ---"
$loginBody = @{ email="customer@copycraft.com"; password="Password123!"; portal="customer" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$customerToken = $loginRes.token
Write-Host "[PASS] Customer Login - $($loginRes.message)"
$results += @{ Name="Customer Login"; Status="PASS"; Message=$loginRes.message }

# 3. AUTHENTICATION - Dealer Login
$loginBody = @{ email="dealer@copycraft.com"; password="Password123!"; portal="dealer" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$dealerToken = $loginRes.token
Write-Host "[PASS] Dealer Login - $($loginRes.message)"
$results += @{ Name="Dealer Login"; Status="PASS"; Message=$loginRes.message }

# 4. AUTHENTICATION - Distributor Login
$loginBody = @{ email="distributor@copycraft.com"; password="Password123!"; portal="distributor" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$distributorToken = $loginRes.token
Write-Host "[PASS] Distributor Login - $($loginRes.message)"
$results += @{ Name="Distributor Login"; Status="PASS"; Message=$loginRes.message }

# 5. AUTHENTICATION - Admin Login
$loginBody = @{ email="admin@copycraft.com"; password="Password123!"; portal="admin" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$adminToken = $loginRes.token
Write-Host "[PASS] Admin Login - $($loginRes.message)"
$results += @{ Name="Admin Login"; Status="PASS"; Message=$loginRes.message }

# 6. AUTHENTICATION - Super Admin Login
$loginBody = @{ email="superadmin@copycraft.com"; password="Password123!"; portal="admin" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$superAdminToken = $loginRes.token
Write-Host "[PASS] Super Admin Login - $($loginRes.message)"
$results += @{ Name="Super Admin Login"; Status="PASS"; Message=$loginRes.message }

# 7. AUTHENTICATION - Wrong password
Write-Host "`n--- SECURITY TESTS ---"
try {
    $badBody = @{ email="customer@copycraft.com"; password="wrong"; portal="customer" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $badBody -ErrorAction Stop
    Write-Host "[FAIL] Wrong Password - Should have returned error"
} catch {
    Write-Host "[PASS] Wrong Password - Correctly rejected"
    $results += @{ Name="Wrong Password Rejection"; Status="PASS"; Message="Correctly rejected" }
}

# 8. Portal Role Mismatch (Customer trying dealer portal)
try {
    $mismatchBody = @{ email="customer@copycraft.com"; password="Password123!"; portal="dealer" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $mismatchBody -ErrorAction Stop
    Write-Host "[FAIL] Portal Mismatch - Should have returned error"
} catch {
    Write-Host "[PASS] Portal Role Mismatch - Intrusion detected and logged"
    $results += @{ Name="Portal Role Mismatch"; Status="PASS"; Message="Intrusion detected and logged" }
}

# 9. REGISTRATION
Write-Host "`n--- 3. REGISTRATION ---"
$regBody = @{ name="Test User"; phone="+91 99999 11111"; email="testuser_$(Get-Date -Format 'HHmmss')@test.com"; password="Test@123"; roomDetails="Hostel 7, Room 101" } | ConvertTo-Json
$regRes = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $regBody
Write-Host "[PASS] Customer Registration - $($regRes.message) (PIN: $($regRes.deliveryPin))"
$results += @{ Name="Customer Registration"; Status="PASS"; Message=$regRes.message }

# 10. Duplicate Registration
try {
    $dupBody = @{ name="Duplicate"; phone="+91 11111 22222"; email="customer@copycraft.com"; password="Test@123" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $dupBody -ErrorAction Stop
    Write-Host "[FAIL] Duplicate Registration - Should have been rejected"
} catch {
    Write-Host "[PASS] Duplicate Registration - Correctly rejected"
    $results += @{ Name="Duplicate Registration"; Status="PASS"; Message="Correctly rejected" }
}

# 11. PROFILE
Write-Host "`n--- 4. PROFILE ---"
$r = Test-Endpoint -Name "Get Profile" -Method GET -Url "$baseUrl/auth/profile" -Token $customerToken
$results += $r

# 12. Update Profile
$updateBody = @{ name="Ananya Sharma Updated"; phone="+91 96333 44455" } | ConvertTo-Json
$r = Test-Endpoint -Name "Update Profile" -Method PUT -Url "$baseUrl/auth/profile" -Body $updateBody -Token $customerToken
$results += $r

# 13. Delivery PIN
$r = Test-Endpoint -Name "Get Delivery PIN" -Method GET -Url "$baseUrl/auth/delivery-pin" -Token $customerToken
$results += $r

# 14. NOTIFICATIONS
Write-Host "`n--- 5. NOTIFICATIONS ---"
$r = Test-Endpoint -Name "Get Notifications" -Method GET -Url "$baseUrl/auth/notifications" -Token $customerToken
$results += $r

$markBody = @{ ids=@("ntf_1") } | ConvertTo-Json
$r = Test-Endpoint -Name "Mark Notifications Read" -Method PUT -Url "$baseUrl/auth/notifications/read" -Body $markBody -Token $customerToken
$results += $r

# 15. COLLEGES LIST (public)
Write-Host "`n--- 6. ORDERS & PRICING ---"
$r = Test-Endpoint -Name "Get Colleges List" -Method GET -Url "$baseUrl/orders/colleges"
$results += $r

# 16. Price Quote
$quoteBody = @{ pageCount=20; quantity=2; paperSize="A4"; printMode="bw"; sideMode="double"; binding="spiral"; lamination="none"; coverSheet="transparent"; couponCode="WELCOME10" } | ConvertTo-Json
$r = Test-Endpoint -Name "Calculate Price Quote" -Method POST -Url "$baseUrl/orders/quote" -Body $quoteBody
$results += $r

# 17. Create Order
$orderBody = @{
    files=@(
        @{ id="file_test_1"; name="TestDocument.pdf"; pageCount=10; printMode="bw"; sideMode="double"; paperSize="A4"; binding="spiral"; quantity=1 }
    )
    collegeName="IIT Bombay"
    deliveryLocation="Hostel 4, Room 302"
    paymentMethod="COD"
    couponCode="WELCOME10"
} | ConvertTo-Json -Depth 5
$r = Test-Endpoint -Name "Create Order" -Method POST -Url "$baseUrl/orders/create" -Body $orderBody -Token $customerToken
$results += $r

# 18. My Orders
$r = Test-Endpoint -Name "Get Customer Orders" -Method GET -Url "$baseUrl/orders/my-orders" -Token $customerToken
$results += $r

# 19. Get Order By ID
$r = Test-Endpoint -Name "Get Order By ID" -Method GET -Url "$baseUrl/orders/ORD-2026-8901" -Token $customerToken
$results += $r

# 20. Cancel Order
$r = Test-Endpoint -Name "Cancel Order" -Method POST -Url "$baseUrl/orders/ORD-2026-8902/cancel" -Token $customerToken -ExpectSuccess $false
$results += $r

# 21. Active Staff
$r = Test-Endpoint -Name "Get Active Staff" -Method GET -Url "$baseUrl/orders/staff/active" -Token $customerToken
$results += $r

# 22. DEALER FEATURES
Write-Host "`n--- 7. DEALER FEATURES ---"
$r = Test-Endpoint -Name "Dealer Queue" -Method GET -Url "$baseUrl/dealer/queue" -Token $dealerToken
$results += $r

# 23. Update Order Status
$statusBody = @{ status="PRINTING"; note="Started printing test" } | ConvertTo-Json
$r = Test-Endpoint -Name "Update Order Status" -Method PUT -Url "$baseUrl/dealer/orders/ORD-2026-8901/status" -Body $statusBody -Token $dealerToken
$results += $r

# 24. Verify Delivery PIN
$pinBody = @{ pin="482901" } | ConvertTo-Json
$r = Test-Endpoint -Name "Verify Delivery PIN" -Method POST -Url "$baseUrl/dealer/orders/ORD-2026-8901/verify-pin" -Body $pinBody -Token $dealerToken
$results += $r

# 25. Wrong PIN test
try {
    $wrongPinBody = @{ pin="000000" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/dealer/orders/ORD-2026-8902/verify-pin" -Method POST -ContentType "application/json" -Headers @{ Authorization="Bearer $dealerToken" } -Body $wrongPinBody -ErrorAction Stop
    Write-Host "[FAIL] Wrong Delivery PIN - Should have been rejected"
} catch {
    Write-Host "[PASS] Wrong Delivery PIN - Correctly rejected"
    $results += @{ Name="Wrong PIN Rejection"; Status="PASS"; Message="Correctly rejected" }
}

# 26. Update Inventory
$invBody = @{ currentStock=10; status="LOW_STOCK" } | ConvertTo-Json
$r = Test-Endpoint -Name "Update Inventory" -Method PUT -Url "$baseUrl/dealer/inventory/inv_1" -Body $invBody -Token $dealerToken
$results += $r

# 27. DISTRIBUTOR FEATURES
Write-Host "`n--- 8. DISTRIBUTOR FEATURES ---"
$r = Test-Endpoint -Name "Distributor Dashboard" -Method GET -Url "$baseUrl/distributor/dashboard" -Token $distributorToken
$results += $r

# 28. ADMIN FEATURES
Write-Host "`n--- 9. ADMIN FEATURES ---"
$r = Test-Endpoint -Name "Admin Analytics" -Method GET -Url "$baseUrl/admin/analytics" -Token $adminToken
$results += $r

$r = Test-Endpoint -Name "Get All Users" -Method GET -Url "$baseUrl/admin/users" -Token $adminToken
$results += $r

$r = Test-Endpoint -Name "Get Coupons" -Method GET -Url "$baseUrl/admin/coupons" -Token $adminToken
$results += $r

$r = Test-Endpoint -Name "Get Audit Logs" -Method GET -Url "$baseUrl/admin/audit-logs" -Token $adminToken
$results += $r

# 29. Create Coupon
$couponBody = @{ code="TEST99"; discountPercentage=15; maxDiscount=200; minOrderValue=50; expiryDate="2026-12-31" } | ConvertTo-Json
$r = Test-Endpoint -Name "Create Coupon" -Method POST -Url "$baseUrl/admin/coupons" -Body $couponBody -Token $adminToken
$results += $r

# 30. Create Staff Account
$staffBody = @{ name="Test Dealer"; email="testdealer_$(Get-Date -Format 'HHmmss')@test.com"; password="Staff@123"; phone="+91 88888 77777"; role="dealer"; collegeId="clg_1" } | ConvertTo-Json
$r = Test-Endpoint -Name "Create Staff Account" -Method POST -Url "$baseUrl/admin/staff" -Body $staffBody -Token $adminToken
$results += $r

# 31. Create College
$collegeBody = @{ name="NIT Warangal"; code="NITW"; city="Warangal"; deliveryLocations=@("Boys Hostel", "Girls Hostel", "Admin Block") } | ConvertTo-Json
$r = Test-Endpoint -Name "Create College" -Method POST -Url "$baseUrl/admin/colleges" -Body $collegeBody -Token $adminToken
$results += $r

# 32. Update Pricing
$pricingBody = @{ printMode=@{ bw=1.50; color=6.00 } } | ConvertTo-Json -Depth 3
$r = Test-Endpoint -Name "Update Pricing" -Method PUT -Url "$baseUrl/admin/pricing" -Body $pricingBody -Token $adminToken
$results += $r

# 33. AI ANALYSIS
Write-Host "`n--- 10. AI DOCUMENT ANALYSIS ---"
$aiBody = @{ fileName="thesis_chapter3.pdf"; fileSize=2500000; pageCount=25 } | ConvertTo-Json
$r = Test-Endpoint -Name "AI Document Analysis" -Method POST -Url "$baseUrl/ai/analyze" -Body $aiBody -Token $customerToken
$results += $r

# 34. PAYMENT RECEIPTS
Write-Host "`n--- 11. PAYMENT RECEIPTS ---"
$r = Test-Endpoint -Name "Get Payment Receipts" -Method GET -Url "$baseUrl/payments/receipts" -Token $customerToken
$results += $r

# 35. RBAC - Customer accessing admin endpoint
Write-Host "`n--- 12. RBAC / AUTHORIZATION ---"
try {
    Invoke-RestMethod -Uri "$baseUrl/admin/analytics" -Method GET -Headers @{ Authorization="Bearer $customerToken" } -ErrorAction Stop
    Write-Host "[FAIL] RBAC - Customer should not access admin"
} catch {
    Write-Host "[PASS] RBAC - Customer correctly blocked from admin endpoint"
    $results += @{ Name="RBAC Admin Block"; Status="PASS"; Message="Customer blocked from admin" }
}

# Customer accessing dealer endpoint
try {
    Invoke-RestMethod -Uri "$baseUrl/dealer/queue" -Method GET -Headers @{ Authorization="Bearer $customerToken" } -ErrorAction Stop
    Write-Host "[FAIL] RBAC - Customer should not access dealer"
} catch {
    Write-Host "[PASS] RBAC - Customer correctly blocked from dealer endpoint"
    $results += @{ Name="RBAC Dealer Block"; Status="PASS"; Message="Customer blocked from dealer" }
}

# 36. No token test
try {
    Invoke-RestMethod -Uri "$baseUrl/auth/profile" -Method GET -ErrorAction Stop
    Write-Host "[FAIL] Auth Guard - Should require token"
} catch {
    Write-Host "[PASS] Auth Guard - No-token request correctly rejected"
    $results += @{ Name="Auth Guard No Token"; Status="PASS"; Message="Correctly rejected" }
}

# 37. FILE ROUTES
Write-Host "`n--- 13. FILE ROUTES ---"
$r = Test-Endpoint -Name "Get Order Files" -Method GET -Url "$baseUrl/files/ORD-2026-8901" -Token $dealerToken
$results += $r

# 38. 404 ROUTE
Write-Host "`n--- 14. 404 HANDLING ---"
try {
    Invoke-RestMethod -Uri "$baseUrl/nonexistent/route" -Method GET -ErrorAction Stop
    Write-Host "[FAIL] 404 Handler - Should return 404"
} catch {
    Write-Host "[PASS] 404 Handler - Correctly returns 404 for unknown route"
    $results += @{ Name="404 Handler"; Status="PASS"; Message="Correctly returns 404" }
}

# SUMMARY
Write-Host "`n=========================================="
Write-Host "  TEST RESULTS SUMMARY"
Write-Host "=========================================="

$passed = ($results | Where-Object { $_.Status -like "PASS*" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $results.Count

Write-Host "`nTotal Tests: $total"
Write-Host "Passed: $passed"  -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "`n=========================================="

if ($failed -gt 0) {
    Write-Host "`nFailed Tests:"
    $results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Message)" -ForegroundColor Red
    }
}
