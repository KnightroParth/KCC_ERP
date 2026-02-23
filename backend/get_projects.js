require('dotenv').config();

const DATABASE = process.env.DATABASE || 'mongodb://localhost:27017/idurar';

mongoose.connect(DATABASE).then(async () => {
    const Project = mongoose.model('Project', new mongoose.Schema({ name: String }));
    const projects = await Project.find({ name: { $in: [/Lotus Park/i, /Lotus Green/i] } });
    console.log(JSON.stringify(projects, null, 2));
    process.exit();
}).catch(e => {
    console.error(e);
    process.exit(1);
});
