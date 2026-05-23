const express = require("express");

const router = express.Router();

const Volunteer = require("../models/Volunteer");



// GET all volunteers
router.get("/", async (req, res) => {

    try {

        const volunteers = await Volunteer.find();

        res.json(volunteers);

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});



// CREATE volunteer
router.post("/", async (req, res) => {

    try {

        const volunteer = new Volunteer(req.body);

        await volunteer.save();

        res.json({
            success: true,
            volunteer
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});



// UPDATE volunteer
router.put("/:id", async (req, res) => {

    try {

        await Volunteer.findByIdAndUpdate(
            req.params.id,
            req.body
        );

        res.json({
            success: true
        });

    } catch (error) {

        res.status(500).json({
            success: false
        });
    }
});



// DELETE volunteer
router.delete("/:id", async (req, res) => {

    try {

        await Volunteer.findByIdAndDelete(
            req.params.id
        );

        res.json({
            success: true
        });

    } catch (error) {

        res.status(500).json({
            success: false
        });
    }
});



module.exports = router;