const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

// เพิ่มบรรทัดนี้เพื่อให้ Express สามารถอ่านไฟล์ static (เช่น index.html) ในโฟลเดอร์โปรเจกต์ได้
app.use(express.static('.'));

const MONGO_URL = 'mongodb://127.0.0.1:27017';
const DATABASE_NAME = 'account-db';
let db, usersCollection;

// API สำหรับสมัครสมาชิก
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, name } = req.body;
    
    // ตรวจสอบว่ามี username นี้ในระบบหรือยัง
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
    }

    // เข้ารหัสรหัสผ่านด้วย bcryptjs (salt rounds = 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // บันทึกข้อมูลสมาชิกใหม่ลง MongoDB
    const result = await usersCollection.insertOne({
      username,
      password: hashedPassword,
      name,
      createdAt: new Date()
    });

    res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ', userId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API สำหรับเข้าสู่ระบบ
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // ค้นหาผู้ใช้จาก username
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' });
    }

    // ตรวจสอบรหัสผ่านว่าตรงกับที่เข้ารหัสไว้หรือไม่
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }

    res.json({ message: 'เข้าสู่ระบบสำเร็จ', username: user.username, name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  db = client.db(DATABASE_NAME);
  usersCollection = db.collection('users');
  console.log('เชื่อมต่อฐานข้อมูล MongoDB สำเร็จ');

  app.listen(3000, () => {
    console.log('เซิร์ฟเวอร์กำลังรันที่ http://localhost:3000');
  });
}

startServer().catch(console.error);