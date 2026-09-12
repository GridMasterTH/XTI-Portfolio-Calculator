# XTI-Portfolio-Calculator

เครื่องคำนวณ Grid, Basket, Break-even, Target Inventory, Survival และ Stop Out สำหรับ XTI Original Hybrid

## v0.2 — Target Inventory Survival model

เวอร์ชันนี้แก้แบบจำลอง Grid ให้ตรงกับพฤติกรรม EA มากขึ้น:

- G40 = Target รวม 40 ไม้
- ถ้าเริ่ม Cycle ที่ G40 และ Actual=0 → Initial Batch 40 ไม้ใกล้ราคา G40
- ลง G41 → เพิ่ม 1 ไม้ให้รวม 41
- ลง G42 → เพิ่ม 1 ไม้ให้รวม 42
- เมื่อถึงขอบ BUY จะหยุดเพิ่ม Position ใหม่
- คำนวณ Floating, Equity, Margin Level, Stop Out โดยประมาณ
- คำนวณเงินที่ต้องเติมเพื่อให้รอดถึงราคา Survival ที่กำหนด
- มีตารางเปรียบเทียบทุกจุดเริ่ม Cycle ภายในกรอบ Grid

## วิธีใช้

เปิด `index.html` หรือใช้งานผ่าน GitHub Pages ได้โดยตรง ทุกการคำนวณทำใน Browser และไม่มีการส่งข้อมูลพอร์ตไปยัง Server

## หมายเหตุสำคัญ

Stop Out และ Margin เป็นการประมาณด้วยสูตรมาตรฐาน `price × contract × lot ÷ leverage` เท่านั้น Broker แต่ละรายอาจใช้สูตร Margin, Margin Rate, Stop Out, Swap, Commission และเงื่อนไข CFD ต่างกัน จึงควรใช้เพื่อวางแผน/เปรียบเทียบและยืนยันกับ Specification ของ Broker ก่อนใช้เงินจริง

## ค่า Contract เริ่มต้น

ตั้งค่าเริ่มต้นเป็น `1000` เพราะจากประวัติ XTI ที่ทดสอบจริง 0.01 lot ซื้อ 56.95 และขาย 57.42 (ส่วนต่าง $0.47) ให้กำไร $4.70 ซึ่งสอดคล้องกับ Contract Size ประมาณ 1000 หน่วยต่อ 1.00 lot.
