const User = require('../models/User');
const bcrypt = require('bcryptjs');

const SEED_USERS = [
    { username: 'nickson', name: 'Nickson', role: 'staff', branch: 'betfalme' },
    { username: 'sarah', name: 'Sarah Wilson', role: 'staff', branch: 'betfalme' },
    { username: 'mike', name: 'Mike Chen', role: 'staff', branch: 'betfalme' },
    { username: 'emma', name: 'Emma Davis', role: 'staff', branch: 'betfalme' },
    { username: 'james', name: 'James Wilson', role: 'staff', branch: 'betfalme' },
    { username: 'robert', name: 'Robert Mutua', role: 'staff', branch: 'betfalme' },
    { username: 'alice', name: 'Alice Wanjiku', role: 'staff', branch: 'betfalme' },
    { username: 'kelvin', name: 'Kelvin Otieno', role: 'staff', branch: 'betfalme' },
    { username: 'stacy', name: 'Stacy Kamau', role: 'staff', branch: 'betfalme' },
    { username: 'faith', name: 'Faith Mutua', role: 'staff', branch: 'sofa_safi' },
];

const seedStaff = async () => {
    try {
        console.log('🌱 Checking staff population...');
        const userCount = await User.countDocuments({ role: { $ne: 'admin' } });

        if (userCount < 9) {
            console.log(`🚀 Only ${userCount} staff found. Seeding default staff members...`);
            const hash = bcrypt.hashSync('falmebet123', 10);

            for (const userData of SEED_USERS) {
                const exists = await User.findOne({ username: userData.username });
                if (!exists) {
                    await User.create({
                        ...userData,
                        password_hash: hash,
                        transport_allowance: 150 // Default allowance
                    });
                    console.log(`✅ Seeded staff: ${userData.name} (${userData.username})`);
                }
            }
            console.log('✨ Staff seeding complete.');
        } else {
            console.log(`ℹ️ Staff population adequate (${userCount} users). Skipping seeding.`);
        }
    } catch (err) {
        console.error('❌ Staff seeding failed:', err.message);
    }
};

module.exports = { seedStaff };
