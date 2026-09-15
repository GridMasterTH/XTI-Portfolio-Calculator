# XTI Portfolio Calculator v0.3

เครื่องคำนวณสำหรับ XTI Original Hybrid / Target Inventory Ladder ที่ปรับให้รองรับสเปก Broker จริง โดยเฉพาะ Axi USOIL

## สิ่งใหม่ใน v0.3

- Preset **Axi USOIL**: Contract 10, Minimum Volume 0.1, Volume Step 0.1
- แสดง **Lot ที่ขอ** เทียบกับ **Lot ที่ Broker ใช้จริงหลัง Normalize**
- คำนวณ Exposure จาก `Contract × Actual Lot`
- รองรับบัญชี **USD / USC (Cent)** โดยคำนวณความเสี่ยงภายในเป็นเงินจริง USD
- แสดงค่า Basket ที่ต้องใส่ใน EA เมื่อบัญชีเป็น USC
- เคารพ `Max Positions` และ `Max Total Lots`
- แยก **Raw Target** ออกจาก **Actual ที่เปิดได้จริง**
- แจ้งเตือนเมื่อ Lot Cap ทำให้ Target Ladder ไม่สามารถเติมครบถึง Lower Limit
- คำนวณ Max Total Lots ที่ต้องมี หากต้องการ Stress Test Target Ladder เต็มกรอบ
- รองรับ Margin multiplier จากหน้า Specification; Axi USOIL preset ใช้ `0.01`
- Survival / Stop Out / เงินเติม / Buffer
- ตารางทุกจุดเริ่ม Cycle
- Basket Calculator และ Position Calculator
- เก็บค่าใน Local Storage เท่านั้น ไม่มี Server

## Axi Precision Benchmark ที่ใช้ตรวจพฤติกรรม EA

- Symbol: USOIL
- H1
- Period: 2026-05-05 ถึง 2026-09-15
- History Quality: **100% real ticks**
- Ticks: **18,020,139**
- Trades: 83
- Win rate: 92.77%
- Max Equity DD: 2.03%
- Net Profit: $174.06

ผล Benchmark ใช้ยืนยันพฤติกรรม EA บน Real Tick จริง แต่ช่วงดังกล่าวไม่ได้ลากถึง Lower Limit 45 จึงไม่ใช่หลักฐานว่า MM เต็มกรอบ 85–45 รอดแน่นอน

## วิธีอัปเดต GitHub Pages

วิธีง่ายสุด: อัปโหลด `index.html` ทับไฟล์เดิมใน root ของ Repo แล้ว Commit จากนั้นรอ GitHub Pages deploy ใหม่

ไฟล์นี้เป็น single-file: CSS และ JavaScript อยู่ใน `index.html` ทั้งหมด เพื่อลดปัญหา cache คนละเวอร์ชัน

## ข้อจำกัด

เป็นเครื่องคำนวณประมาณการ ไม่ใช่การรับประกันผลลัพธ์จริง. Swap, commission, slippage, gap, liquidity, Stop Out rule และ margin rule ของ Broker อาจทำให้ผลจริงแตกต่างจากแบบจำลอง
