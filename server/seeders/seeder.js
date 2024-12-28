require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { mongodbUri } = require('../config/env');

const users = [
    {
        username: 'zalz',
        email: 'zalzdarkent@gmail.com',
        phoneNumber: '081361415931',
        password: 'zalz12345',
        token: '',
        photo: '',
        role: 'admin'
    },
];

const seedDatabase = async () => {
    try {
        await mongoose.connect(mongodbUri);

        await User.deleteMany();

        console.log('Previous data cleared');

        await User.create(users);
        console.log('Users seeded');

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();