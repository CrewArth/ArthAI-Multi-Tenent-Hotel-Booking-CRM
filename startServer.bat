@echo off
wt.exe -M ^
new-tab --title "frontend" -d "D:\GuestHouseBookingSystem\frontend" powershell -NoExit -Command "npm run dev" ; ^
new-tab --title "backend" -d "D:\GuestHouseBookingSystem\backend" powershell -NoExit -Command "npm run dev" ; ^
new-tab --title "sa_backend" -d "D:\GuestHouseBookingSystem\sa_backend" powershell -NoExit -Command "npm run dev" ; ^
new-tab --title "sa_frontend" -d "D:\GuestHouseBookingSystem\sa_frontend" powershell -NoExit -Command "npm run dev"