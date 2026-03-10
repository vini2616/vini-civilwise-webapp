
import mongoose from 'mongoose';
import Transaction from '../models/Transaction';
import User from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const debugCashbook = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to DB');

        const users = await User.find({});
        const userMap = users.reduce((acc: Record<string, string>, u: any) => ({ ...acc, [u._id.toString()]: u.name }), {});

        const transactions = await Transaction.find({ isCashbook: true });

        console.log(`Found ${transactions.length} Cashbook transactions:`);
        transactions.forEach(t => {
            const userName = (userMap as any)[t.userId.toString()] || 'Unknown';
            console.log(JSON.stringify({ date: t.date, user: userName, userId: t.userId, amount: t.amount, type: t.type, note: t.note, siteId: t.siteId }));
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
};

debugCashbook();
