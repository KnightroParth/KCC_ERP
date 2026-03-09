const mongoose = require('mongoose');
const doc = { _id: 1, name: 'A', startDate: new Date() };

// Mongoose findByIdAndUpdate simulates this:
// If we pass an object without $ operators:
console.log( 'If we do findByIdAndUpdate with { rate: 500 }' );
// it becomes { $set: { rate: 500 } }
