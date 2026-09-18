import express from 'express';
import { syncCentralUserSafely } from '../utils/centralUserDirectory.js';

const router = express.Router();

//POSTMAN POST Req for Admin Creation
router.post('/create-admin', async(req, res) => {
    try{
        const { User } = req.tenantModels;
        const {firstName, lastName, email, phone, password} = req.body;

        const existingUser = await User.findOne({email});
        if(existingUser) return res.status(400).json({
            message: "Admin Already Exists"
        });

        const admin = new User({
            firstName,
            lastName,
            email,
            phone,
            password,
            role: "SUPER_ADMIN",
            isActive: true
        });

        await admin.save();
        await syncCentralUserSafely({ user: admin, dbName: req.tenantDb?.name }, 'legacy admin creation');
        res.status(201).json({
            message: "Super Admin Created Sucessfully", admin
        })
    }catch(error){
        res.status(500).json({
            message: error.message
        })
    }
});

export default router;
