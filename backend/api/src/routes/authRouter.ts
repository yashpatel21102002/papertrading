import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { validateEmail, validatePassword } from '../utils/validators';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

router.post('/register', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!validateEmail(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ error: "Password must be at least 6 characters long" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, balance: 100000 } // Demo balance
        });
        res.json({
            message: "User created",
            user: { id: user.id, email: user.email, balance: user.balance }
        });
    } catch (e) {
        next(e);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (e) {
        next(e);
    }
});

export default router;