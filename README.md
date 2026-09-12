# XTI Portfolio Calculator

เครื่องคำนวณ Grid, Basket, Break-even, Survival และการล้างพอร์ตสำหรับ XTI Original Hybrid

## จุดประสงค์
เว็บ Static ที่ทำงานใน Browser โดยตรง ไม่มี Backend และไม่เชื่อมบัญชี MT5

### ฟังก์ชัน v0.1
- คำนวณราคา Break-even / ราคาเป้าล้าง Basket
- ตั้งเป้า Basket เป็น USD หรือ % ของ Balance ตอนเริ่ม Cycle
- ใส่ Position จริงหลายไม้แบบ `ราคาเข้า,lot,swap+fee`
- จำลอง Fixed Grid เช่น Origin 85 / Step 0.50 / Lot 0.01
- ประมาณ Floating, Equity, Margin, Margin Level และทุน Buffer
- Responsive สำหรับมือถือและ Desktop
- บันทึกค่าล่าสุดใน Local Storage ของ Browser

## วิธีเปิด GitHub Pages
1. Upload `index.html`, `style.css`, `app.js` และ `.nojekyll` ไว้ที่ root ของ branch `main`
2. ไปที่ **Settings → Pages**
3. ใน **Build and deployment** เลือก **Deploy from a branch**
4. Branch: `main`
5. Folder: `/(root)`
6. Save

URL จะอยู่ในรูปแบบ:
`https://gridmasterth.github.io/XTI-Portfolio-Calculator/`

## สูตรหลัก
`Open P/L = (FuturePrice - AverageEntry) × ContractValue × TotalLots`

`Cycle Net = Realized + Swap/Fee + Open P/L`

ระบบแก้สมการย้อนกลับเพื่อหาราคาที่ทำให้ Cycle Net เท่ากับ Basket Target

## คำเตือน
ค่าที่คำนวณเป็นประมาณการเท่านั้น Swap ในอนาคต, Spread, Slippage, Liquidity, Broker reject และกฎ Margin ของแต่ละ Broker อาจทำให้ผลจริงต่างออกไป
