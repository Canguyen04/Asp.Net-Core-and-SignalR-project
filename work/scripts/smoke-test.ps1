# PowerShell: Run AFTER backend is listening at http://localhost:5000
$ErrorActionPreference = 'Stop'
$base='http://localhost:5000/api'
function Login($email){
  Invoke-RestMethod -Method POST -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email=$email;password='Demo@12345'}|ConvertTo-Json)
}
function Headers($auth){ @{Authorization="Bearer $($auth.access_token)"} }
$customer=Login 'customer@demo.local';$driver=Login 'driver@demo.local';$admin=Login 'admin@demo.local'
$payload=@{
 pickupAddress='273 An Duong Vuong, Quan 5';dropoffAddress='Landmark 81, Binh Thanh'
 pickupLat=10.7604;pickupLng=106.6822;dropoffLat=10.7945;dropoffLng=106.7218
 serviceType='express';senderName='Demo customer';senderPhone='0900000000';receiverName='Test receiver';receiverPhone='0911111111'
 packageDetails='Tai lieu';paymentMethod='cash';isBulky=$false;isDoorDelivery=$false;tipAmount=0;codAmount=0;promotionCode=$null
}|ConvertTo-Json
$order=Invoke-RestMethod -Method POST -Uri "$base/orders" -Headers (Headers $customer) -ContentType 'application/json' -Body $payload
Write-Host "Created #$($order.id) status=$($order.status)"
$online=@{latitude=10.7626;longitude=106.6601;online=$true}|ConvertTo-Json
Invoke-RestMethod -Method PUT -Uri "$base/drivers/me/location" -Headers (Headers $driver) -ContentType 'application/json' -Body $online | Out-Null
$accept=Invoke-RestMethod -Method POST -Uri "$base/orders/$($order.id)/accept" -Headers (Headers $driver)
Write-Host "Accepted status=$($accept.status)"
foreach($next in @('arrived_pickup','delivering','completed')){
  $result=Invoke-RestMethod -Method PATCH -Uri "$base/orders/$($order.id)/status" -Headers (Headers $driver) -ContentType 'application/json' -Body (@{status=$next}|ConvertTo-Json)
  Write-Host "Updated status=$($result.status)"
}
$history=Invoke-RestMethod -Uri "$base/orders/$($order.id)/history" -Headers (Headers $customer)
$summary=Invoke-RestMethod -Uri "$base/admin/summary" -Headers (Headers $admin)
Write-Host "History=$($history.Count) events; Admin orders=$($summary.orderCount); revenue=$($summary.totalRevenue)"
if($history.Count -ne 5 -or $result.status -ne 'completed') { throw 'Smoke test FAILED' }
Write-Host 'SMOKE TEST OK' -ForegroundColor Green
