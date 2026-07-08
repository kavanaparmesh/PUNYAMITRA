require("dotenv").config(); 

const LoginLog = require("./models/LoginLog");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadPath = path.join(__dirname, "uploads", "claims");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const app = express();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {

    let uploadPath = "";

    if (file.fieldname === "aadhaar") {
      uploadPath = path.join(__dirname, "uploads", "agents", "aadhaar");
    }
    else if (file.fieldname === "pan") {
      uploadPath = path.join(__dirname, "uploads", "agents", "pan");
    }
    else if (file.fieldname === "photo") {
      uploadPath = path.join(__dirname, "uploads", "agents", "photos");
    }

    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  }
});

const upload = multer({
  storage
});

const memberStorage = multer.diskStorage({
  destination: function (req, file, cb) {

    let uploadPath = "";

    if (file.fieldname === "aadhaar") {
      uploadPath = path.join(__dirname, "uploads", "members", "aadhaar");
    }
    else if (file.fieldname === "pan") {
      uploadPath = path.join(__dirname, "uploads", "members", "pan");
    }
    else if (file.fieldname === "photo") {
      uploadPath = path.join(__dirname, "uploads", "members", "photos");
    }

    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  }
});

const memberUpload = multer({
  storage: memberStorage
});

mongoose.connection.once("open", () => {
});

// ✅ Schema
const ContactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String
});

// ✅ Model
const Contact =
mongoose.models.Contact ||
mongoose.model('Contact', ContactSchema);

// ================= ADMIN PROFILE SCHEMA =================

const AdminProfileSchema = new mongoose.Schema({

  fullName: String,
  email: String,
  role: String,
  photo: String

});

const AdminProfile =
mongoose.models.AdminProfile ||
mongoose.model('AdminProfile', AdminProfileSchema);

// ================= GET ADMIN PROFILE =================

app.get('/admin-profile', async (req, res) => {

    try {

        let profile = await AdminProfile.findOne();

        if (!profile) {

            profile = {
                fullName: "Admin User",
                email: "admin@punyamitra.org",
                role: "Super Administrator",
                photo: ""
            };
        }

        res.json({
            success: true,
            profile
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false
        });

    }

});



// ================= UPDATE ADMIN PROFILE =================

app.post("/update-admin-profile", async (req, res) => {

  try {

    const {
      fullName,
      email,
      role,
      photo
    } = req.body;

    let profile = await AdminProfile.findOne();

    if (!profile) {

      profile = new AdminProfile();
    }

    profile.fullName = fullName;
    profile.email = email;
    profile.role = role;
    profile.photo = photo;

    await profile.save();

    res.json({
      success: true,
      profile
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false
    });
  }
});

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Backend running successfully 🚀");
});

// ✅ NEW: Save contact form data
app.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    const newContact = new Contact({
      name,
      email,
      message
    });

    await newContact.save();
    res.send("Message saved successfully!");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving data");
  }
});

// ✅ AGENT SCHEMA
const AgentSchema = new mongoose.Schema({

  agent_id: {
    type: String,
    unique: true
  },

  name: String,

  email: String,

  phone: String,

  role: {
    type: String,
    default: "Agent"
  },

  password: String,

  status: {
    type: String,
    default: "active"
  },

  joinDate: {
    type: String,
    default: () =>
      new Date()
        .toISOString()
        .split("T")[0]
  },
   dob: String,

  aadharFile: String,

  panFile: String,

  photoFile: String


});

const Agent =
mongoose.models.Agent ||
mongoose.model('Agent', AgentSchema);

// helper password
function generatePassword(prefix) {
  return prefix + Math.floor(1000 + Math.random() * 9000);
}

// ✅ Create Agent by Admin
app.post("/agent-login", async (req, res) => {
  const { agentId, password } = req.body;

  try {
        const agent = await Agent.findOne({
      agent_id: agentId,
      password: password,
      status: "active"
    });

    if (!agent) {
      return res.json({ success: false });
    }

    await LoginLog.create({
    name: agent.name,
    role: "Agent",
    action: "Logged In"
  });

    res.json({
      success: true,
      agent: {
        name: agent.name,
        agentId: agent.agent_id
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

// ✅ create-agent
app.post("/create-agent",
upload.fields([
  { name: "aadhaar", maxCount: 1 },
  { name: "pan", maxCount: 1 },
  { name: "photo", maxCount: 1 }
]),
async (req, res) => {
  try {
    const {
  name,
  email,
  phone,
  role,
  dob,
  joinDate
} = req.body;

    const agentId = "AG" + Date.now();
    const password = "AG" + Math.floor(1000 + Math.random() * 9000);
    const newAgent = new Agent({
      agent_id: agentId,
      name,
      email,
      phone,
      password,
      role,
dob,
joinDate,

aadharFile:
  req.files?.aadhaar?.[0]
    ? "/uploads/agents/aadhaar/" + req.files.aadhaar[0].filename
    : "",

panFile:
  req.files?.pan?.[0]
    ? "/uploads/agents/pan/" + req.files.pan[0].filename
    : "",

photoFile:
  req.files?.photo?.[0]
    ? "/uploads/agents/photos/" + req.files.photo[0].filename
    : "",
    });

    await newAgent.save();
    res.json({
      success: true,
      agent: newAgent
    });

  } catch (error) {
    res.status(500).json({
        success: false,
        message: error.message
    });

}
});

// ✅ create-member
app.post(
  "/create-member",
  memberUpload.fields([
    { name: "aadhaar", maxCount: 1 },
    { name: "pan", maxCount: 1 },
    { name: "photo", maxCount: 1 }
  ]),
  async (req, res) => {
    try {

      const {
        name,
        email,
        phone,
        joinDate,
        address
      } = req.body;

      const memberId = "MB" + Date.now();
      const password = "MB" + Math.floor(1000 + Math.random() * 9000);
      const newMember = new Member({
        member_id: memberId,

        name,
        email,
        phone,

        role: "Member",

        password,

        status: "active",

        joinDate,

        address,

        aadharFile:
          req.files?.aadhaar?.[0]
            ? "/uploads/members/aadhaar/" + req.files.aadhaar[0].filename
            : "",

        panFile:
          req.files?.pan?.[0]
            ? "/uploads/members/pan/" + req.files.pan[0].filename
            : "",

        photoFile:
          req.files?.photo?.[0]
            ? "/uploads/members/photos/" + req.files.photo[0].filename
            : ""
      });

      await newMember.save();
      res.json({
        success: true,
        member: newMember
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);


// ✅ Dashboard Summary
app.get("/dashboard-summary", async (req, res) => {
  try {
    const totalAgents = await Agent.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalFarmers = await Farmer.countDocuments();

    res.json({
      totalAgents,
      totalStudents,
      totalFarmers
    });

  } catch (error) {
    res.status(500).send("Dashboard summary failed");
  }
});


// ✅ update agents
app.put("/update-agent/:id", async (req, res) => {

  try {

    const updatedAgent =
      await Agent.findByIdAndUpdate(

        req.params.id,

        req.body,

        { new: true }

      );

    res.json({
      success: true,
      agent: updatedAgent
    });

  } catch(error) {

    console.error(error);

    res.status(500).json({
      success: false
    });

  }

});

// ✅ Get all agents
app.get("/agents", async (req, res) => {
  try {
    const agents = await Agent.find().sort({ _id: -1 });
    res.json(agents);
  } catch (error) {
    console.error("Failed to load agents:", error);
    res.status(500).send("Failed to load agents");
  }
});

// ✅ Agent wise students + farmers
// ✅ Agent wise students + farmers
app.get("/agent/:agentId", async (req, res) => {
  try {

    const agent = await Agent.findOne({
      agent_id: req.params.agentId
    });

    console.log("Requested:", req.params.agentId);
    console.log("Found agent:", agent);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found"
      });
    }

    // ✅ Fix old records that contain only filenames
    if (agent.photoFile && !agent.photoFile.startsWith("/uploads")) {
      agent.photoFile = "/uploads/agents/photos/" + agent.photoFile;
    }

    if (agent.aadharFile && !agent.aadharFile.startsWith("/uploads")) {
      agent.aadharFile = "/uploads/agents/aadhaar/" + agent.aadharFile;
    }

    if (agent.panFile && !agent.panFile.startsWith("/uploads")) {
      agent.panFile = "/uploads/agents/pan/" + agent.panFile;
    }

    const students = await Student.find({
      agent_id: req.params.agentId
    });

    const farmers = await Farmer.find({
      agent_id: req.params.agentId
    });

    res.json({
      success: true,
      agent,
      students,
      farmers
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false
    });
  }
});

// ✅ Activate / deactivate agent
app.put("/agent-status/:agentId", async (req, res) => {
  try {
    await Agent.findOneAndUpdate(
      { agent_id: req.params.agentId },
      { status: req.body.status }
    );

    res.json({ success: true });

  } catch (error) {
    res.status(500).send("Status update failed");
  }
});

// ✅ Reset password
app.put("/reset-agent-password/:agentId", async (req, res) => {
  try {
    const newPassword = generatePassword("NEW");

    await Agent.findOneAndUpdate(
      { agent_id: req.params.agentId },
      { password: newPassword }
    );

    res.json({
      success: true,
      password: newPassword
    });

  } catch (error) {
    res.status(500).send("Password reset failed");
  }
});

// ✅ Delete agent
app.delete("/delete-agent/:id", async (req, res) => {

  try {

    await Agent.findByIdAndDelete(
      req.params.id
    );

    res.json({
      success: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false
    });

  }

});

// ✅ Admin Login Route
app.post("/admin-login", async (req, res) => {
  try {
    const { adminId, password } = req.body;

    await LoginLog.create({
    name: "Super Admin",
    role: "Admin",
    action: "Logged In"
  });
    // temporary static admin
    if (adminId === "adminpunyamitra" && password === "Pm@secure#2004") {
      return res.json({
        message: "Admin login successful",
        admin: {
          name: "Super Admin",
          role: "Administrator"
        }
      });
    }

    res.status(401).send("Invalid admin credentials");

  } catch (error) {
    console.error(error);
    res.status(500).send("Admin login failed");
  }
});



// ✅ contact Routes
app.use(
  "/api/contact",
  require("./routes/contactRoutes")
);

// ✅ Admin Dashboard Stats
app.get("/admin-dashboard-stats", async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalFarmers = await Farmer.countDocuments();

    const pendingStudents = await Student.countDocuments({
      status: { $in: [null, "", "Pending"] }
    });

    const approvedStudents = await Student.countDocuments({
      status: "Approved"
    });

    const rejectedStudents = await Student.countDocuments({
      status: "Rejected"
    });

    const renewedStudents = await Student.countDocuments({
      renewalStatus: "Renewed"
    });

    const pendingFarmers = await Farmer.countDocuments({
      status: { $in: [null, "", "Pending"] }
    });

    const approvedFarmers = await Farmer.countDocuments({
      status: "Approved"
    });

    const rejectedFarmers = await Farmer.countDocuments({
      status: "Rejected"
    });

    const renewedFarmers = await Farmer.countDocuments({
      status: "Renewal Pending"
    });

    // ✅ latest 7 enrollments for dashboard table
    const recentStudents = await Student.find()
      .sort({ _id: -1 })
      .limit(7);
    res.json({
      totalStudents,
      totalFarmers,

      pendingStudents,
      approvedStudents,
      rejectedStudents,
      renewedStudents,

      pendingFarmers,
      approvedFarmers,
      rejectedFarmers,
      renewedFarmers,

      recentStudents
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Dashboard stats failed");
  }
});

// ✅ Document Pending Students
app.get("/document-pending", async (req, res) => {
  try {
    const students = await Student.find({
      status: "Document Pending"
    }).sort({ _id: -1 });

    res.json(students);

  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load document pending students");
  }
});

// ✅ Student Registration Schema
const StudentSchema = new mongoose.Schema({
  fullname: String,
  email: String,
  phone: String,
  date: String,
  aadhaar: String,
  dob: String,
  course: String,
  institution: String,
  year: String,
  password: String,
  student_id: String,
  agent_id: String,
  registeredAt: String,
  pmAccountNo: String, 
  status: { type: String, default: "Pending" },

  renewalStatus: { type: String, default: "" },
  documentStatus: { type: String, default: "" }
  
});

const Student =
mongoose.models.Student ||
mongoose.model('Student', StudentSchema);

// ✅ Student Login Route
app.post("/student-login", async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");

const { studentId, password } = req.body;

const student = await Student.findOne({
  $or: [
    { student_id: studentId },
    { phone: studentId }
  ]
});

if (!student) {
  return res.status(401).json({ success: false });
}

const isMatch = await bcrypt.compare(password, student.password);

if (!isMatch) {
  return res.status(401).json({ success: false });
}

const jwt = require("jsonwebtoken");

const token = jwt.sign(
  { id: student._id },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

await LoginLog.create({
  name: student.fullname,
  role: "Student",
  action: "Logged In"
});

res.json({
  success: true,
  token,
  user: {
    _id: student._id,
    name: student.fullname,
    student_id: student.student_id
  }
});

  } catch (error) {
    console.error(error);
    res.status(500).send("Login error");
  }
});


// ✅ student register route
app.post("/student-register", async (req, res) => {
  try {
    const newStudent = new Student({
      ...req.body,
      pmAccountNo: "PM" + Date.now(),
      status: "Pending"
    });

    await newStudent.save();
    res.send("Student registered successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving student");
  }
});

// ✅ save enrollments
app.post("/save-enrollment", async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      {
        phone: req.body.mobile,
        agent_id: req.body.agent_id
      },
      {
        district: req.body.district,
        area: req.body.area,
        state: req.body.state
      },
     {
      new: true,
      upsert: true
    }
    );

    res.json({ success: true, student });

  } catch (error) {
    console.error(error);
    res.status(500).send("Enrollment save failed");
  }
});

// ✅ student-Renewal Enrollment List
  app.get("/renewal-enrollment-list", async (req, res) => {
  try {
    const students = await Student.find().sort({ _id: -1 });

    const renewalStudents = students.filter(student => {
      if (student.status === "Renewal Pending") return true;
      if (!student.registeredAt) return false;

      const regDate = new Date(student.registeredAt);
      const today = new Date();
      const diffDays = Math.floor((today - regDate) / (1000 * 60 * 60 * 24));

      return diffDays >= 365;
    });

    res.json(renewalStudents);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching renewal list");
  }
});


// ✅ Get Pending Students
app.get("/pending-enrollments", async (req, res) => {
  try {
    const students = await Student.find({
      status: "Pending"
    }).sort({ _id: -1 });

    res.json(students);

  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load pending students");
  }
});

// ✅ Student approve
app.put("/approve-student/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: "Approved" },
      { new: true }
    );

    await LoginLog.create({
    name: "Admin",
    role: "Admin",
    action: `Approved Student ${student.fullname || student.name || "-"}`
  });

    res.json({
      success: true,
      message: "Student approved successfully",
      student
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Approve failed"
    });
  }
});

// ✅ Reject Student
app.put("/reject-student/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: "Rejected" },
      { new: true }
    );

    await LoginLog.create({
    name: "Admin",
    role: "Admin",
    action: `Rejected Student ${student.fullname || student.name || "-"}`
  });
    res.json({
      success: true,
      message: "Student rejected successfully",
      student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Reject failed"
    });
  }
});

// ✅ Get Approved Students
app.get("/approved-enrollments", async (req, res) => {
  try {
    const students = await Student.find({
      status: "Approved"
    }).sort({ _id: -1 });

    res.json(students);

  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load approved students");
  }
});

// ✅ Get Rejected Students
app.get("/rejected-enrollments", async (req, res) => {
  try {
    const students = await Student.find({
      status: "Rejected"
    }).sort({ _id: -1 });

    res.json(students);

  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load rejected students");
  }
});

// ✅ Search Student by Aadhaar
app.get("/api/card/aadhar/:aadhaar", async (req, res) => {
  try {
    const aadhaar = req.params.aadhaar;

    const student = await Student.findOne({
      $or: [
        { aadhaar },
        { aadhar: aadhaar }
      ]
    });

    res.json({
      success: !!student,
      student
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Aadhaar search failed");
  }
});

// ✅ Search Student by Mobile
app.get("/api/card/mobile/:mobile", async (req, res) => {
  try {
    const mobile = req.params.mobile;

    const student = await Student.findOne({
      $or: [
        { phone: mobile },
        { mobile: mobile }
      ]
    });

    res.json({
      success: !!student,
      student
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Mobile search failed");
  }
});

// ✅ Search Student by Punya Mitra Account
app.get("/api/card/punya/:accountNo", async (req, res) => {
  try {
    const accountNo = req.params.accountNo;

    const student = await Student.findOne({
      $or: [
        { punya_account_no: accountNo },
        { accountNo: accountNo },
        { pmAccountNo: accountNo }
      ]
    });

    res.json({
      success: !!student,
      student
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Account search failed");
  }
});


// ✅ student dashboard
app.get("/student-dashboard-data/:agentId", async (req, res) => {
  try {
    const { agentId } = req.params;

    const students = await Student.find({
      agent_id: agentId
    }).sort({ _id: -1 });

    res.json({
      success: true,
      students
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

app.get('/students', async (req, res) => {

    const students = await Student.find().sort({ _id: -1 });
    res.json(students);

});

// DELETE STUDENT
app.delete('/students/:id', async (req, res) => {
   try {

    const student = await Student.findOne({ _id: req.params.id });

   const deletedStudent =
    await Student.findOneAndDelete({ _id: req.params.id });
        if (!deletedStudent) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        res.json({
            success: true,
            message: "Student deleted successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Delete failed"
        });
    }

});

// UPDATE STUDENT
app.put('/students/:id', async (req, res) => {

    try {

        const updatedStudent =
            await Student.findByIdAndUpdate(

                req.params.id,

                req.body,

                { new: true }

            );

        if (!updatedStudent) {

            return res.status(404).json({
                success: false,
                message: "Student not found"
            });

        }

        res.json({
            success: true,
            student: updatedStudent
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Update failed"
        });

    }

});


// ✅ verify-student-password
app.post("/verify-student-password", async (req, res) => {
  try {
    const { mobile, password, agent_id } = req.body;
    const student = await Student.findOne({
      phone: String(mobile).trim(),
      password: String(password).trim(),
      agent_id: String(agent_id).trim()
    });

    if (!student) {
      return res.json({ success: false });
    }

    res.json({ success: true, student });

  } catch (error) {
    console.error(error);
    res.status(500).send("Verification failed");
  }
});


// ✅ create-order
app.post("/create-order", async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    await LoginLog.create({
    name: "System",
    role: "Payment",
    action: `Created Razorpay order ₹${amount}`
  });

    const order = await razorpay.orders.create(options);

    res.json(order);
  } catch (error) {
    console.error("RAZORPAY ERROR FULL:", error);
    res.status(500).json(error);
  }
});


// ✅ Farmer Registration Schema
const FarmerSchema = new mongoose.Schema({
  fullname: String,
  email: String,
  phone: String,
  dob: String,
  address: String,
  farmSize: String,
  land: String,
  crop: String,
  aadhaar: String,
  pmAccountNo: String,
  password: String,
  farmer_id: String,
  agent_id: String,
  registeredAt: String,
  status: { type: String, default: "Pending" },
  renewalStatus: { type: String, default: "" },
  documentStatus: { type: String, default: "" },
  paymentStatus: String
});

const Farmer =
mongoose.models.Farmer ||
mongoose.model('Farmer', FarmerSchema);

// ✅ Farmer Registration Route
app.post("/farmer-register", async (req, res) => {
  try {
    const farmerCount = await Farmer.countDocuments();

    const pmAccountNo = "PMF" + String(farmerCount + 1).padStart(4, "0");
    const farmer_id = "FRM" + Date.now();

    const newFarmer = new Farmer({
    ...req.body,
    pmAccountNo,
    farmer_id,
    registeredAt: new Date().toISOString(),
    status: "Pending"
  });

    await newFarmer.save();
    res.json({
      success: true,
      farmer: newFarmer
    });

    
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving farmer");
  }
});


app.get('/farmers', async (req, res) => {

    const farmers = await Farmer.find().sort({ _id: -1 });
    res.json(farmers);

});

// DELETE FARMER
app.delete('/farmers/:id', async (req, res) => {
   try {

   const farmer = await Farmer.findOne({ _id: req.params.id });
    const deletedFarmer =
       await Farmer.findOneAndDelete({ _id: req.params.id });
        if (!deletedFarmer) {

            return res.status(404).json({
                success: false,
                message: "Farmer not found"
            });

        }

        res.json({
            success: true,
            message: "Farmer deleted successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Delete failed"
        });

    }

});

// UPDATE FARMER
app.put('/farmers/:id', async (req, res) => {

    try {

        const updatedFarmer =
            await Farmer.findByIdAndUpdate(

                req.params.id,

                {
                    fullname: req.body.fullname,
                    email: req.body.email,
                    phone: req.body.phone,
                    land: req.body.land,
                    crop: req.body.crop
                },

                { new: true }

            );

        if (!updatedFarmer) {

            return res.status(404).json({
                success: false,
                message: "Farmer not found"
            });

        }

        res.json({
            success: true,
            farmer: updatedFarmer
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Update failed"
        });

    }

});

// ✅ Farmer Login Route
app.post("/farmer-login", async (req, res) => {
  try {
    const { farmerId, password } = req.body;
    const farmer = await Farmer.findOne({
        $or: [
      { email: farmerId },
      { phone: farmerId },
      { farmer_id: farmerId },
      { agent_id: farmerId }
    ]
    });

    if (!farmer) {
      return res.status(401).send("Farmer not found");
    }

    if (farmer.password.trim() !== password.trim()) {
      return res.status(401).send("Wrong password");
    }

    await LoginLog.create({
    name: farmer.fullname,
    role: "Farmer",
    action: "Logged In"
  });
      res.json({
      success: true,
      message: "Login successful",
      farmer
    });

  } catch (error) {
    res.status(500).send("Farmer login error");
  }
});

// ✅ Approve Farmer
app.put("/approve-farmer/:id", async (req, res) => {
  try {
    const farmer = await Farmer.findByIdAndUpdate(
      req.params.id,
      { status: "Approved" },
      { new: true }
    );

    await LoginLog.create({
    name: "Admin",
    role: "Admin",
    action: `Approved Farmer ${farmer.fullname || farmer.farmerName || "-"}`
  });
      res.json({
      success: true,
      farmer: {
          ...farmer._doc
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false
    });
  }
});


// ✅ Reject farmer
app.put("/reject-farmer/:id", async (req, res) => {
  try {
    const farmer = await Farmer.findByIdAndUpdate(
      req.params.id,
      { status: "Rejected" },
      { new: true }
    );

    await LoginLog.create({
    name: "Admin",
    role: "Admin",
    action: `Rejected Farmer ${farmer.fullname || farmer.farmerName || "-"}`
  });

    res.json({
      success: true,
      message: "Farmer rejected successfully",
      farmer
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Reject failed"
    });
  }
});


// ✅ Rejected Farmers
app.get("/rejected-farmers", async (req, res) => {
  try {
    const farmers = await Farmer.find({
      status: "Rejected"
    }).sort({ _id: -1 });

    res.json(farmers);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load rejected farmers");
  }
});

// ✅ Document Pending Farmers
app.get("/document-pending-farmers", async (req, res) => {
  try {
    const farmers = await Farmer.find({
      status: "Document Pending"
    }).sort({ _id: -1 });

    res.json(farmers);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load document pending farmers");
  }
});

// ✅ Renewal Farmers
app.get("/renewal-farmers", async (req, res) => {
  try {
    const farmers = await Farmer.find().sort({ _id: -1 });

    const renewalFarmers = farmers.filter(farmer => {
      if (farmer.status === "Renewal Pending") return true;
      if (!farmer.registeredAt) return false;

      const regDate = new Date(farmer.registeredAt);
      const today = new Date();
      const diffDays = Math.floor((today - regDate) / (1000 * 60 * 60 * 24));

      return diffDays >= 365;
    });

    res.json(renewalFarmers);

  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load renewal farmers");
  }
});

// ✅ verify-farmer=password
app.post("/verify-farmer-password", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const farmer = await Farmer.findOne({
      phone: mobile.trim(),
      password: password.trim()
    });

    if (!farmer) {
      return res.json({ success: false });
    }

    res.json({
      success: true,
      farmer
    });

  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// ✅ search by-farmer=account
app.get("/search-farmer-account/:accountNo", async (req, res) => {
  try {
    const farmer = await Farmer.findOne({
      pmAccountNo: req.params.accountNo
    });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    res.json({ success: true, farmer });

  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// ✅ search by-farmer-aadhar
app.get("/search-farmer-aadhar/:aadhar", async (req, res) => {
  try {
    const farmer = await Farmer.findOne({
      aadhaar: req.params.aadhar
    });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    res.json({ success: true, farmer });

  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// ✅ search by-farmer-mobile-no
app.get("/search-farmer-mobile/:mobile", async (req, res) => {
  try {
    const farmer = await Farmer.findOne({
      phone: req.params.mobile
    });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    res.json({ success: true, farmer });

  } catch (error) {
    res.status(500).json({ success: false });
  }
});


// ✅ Girls Scholarship Schema
app.get("/farmer-dashboard-data/:agentId", async (req, res) => {
  try {
    const { agentId } = req.params;

    const farmers = await Farmer.find({
      agent_id: agentId
    }).sort({ _id: -1 });

    res.json({
      success: true,
      farmers
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});


// ✅ Girls Scholarship Schema
const GirlsScholarshipSchema = new mongoose.Schema({
  studentName: String,
  mobile: String,
  area: String,
  requestDate: {
    type: Date,
    default: Date.now
  },
  year: String
});

const GirlsScholarship = mongoose.model(
  "GirlsScholarship",
  GirlsScholarshipSchema
);


// ✅ Save Scholarship Form
app.post("/girls-scholarship", async (req, res) => {
  try {
    const scholarship = new GirlsScholarship(req.body);
    await scholarship.save();
    res.send("Scholarship saved successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving scholarship");
  }
});

// ✅ Get Scholarship List
app.get("/girls-scholarship-list", async (req, res) => {
  try {
    const data = await GirlsScholarship.find().sort({ requestDate: -1 });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching scholarship list");
  }
});

// ✅ Health Claim Schema
const HealthClaimSchema = new mongoose.Schema({
  studentName: String,
  mobile: String,
  area: String,
  requestDate: {
    type: Date,
    default: Date.now
  }
});

const HealthClaim = mongoose.model("HealthClaim", HealthClaimSchema);

// ✅ Save Health Claim
app.post("/health-claim", async (req, res) => {
  try {
    const claim = new HealthClaim(req.body);
    await claim.save();
    res.send("Health claim saved successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving health claim");
  }
});

// ✅ Get Health Claim List
app.get("/health-claim-list", async (req, res) => {
  try {
    const data = await HealthClaim.find().sort({ requestDate: -1 });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching health claim list");
  }
});

const claimStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

// ✅upload-claim
const uploadClaim = multer({
  storage: claimStorage
});

// ✅claim-schema
const claimSchema = new mongoose.Schema({
    userId: String,
    hospitalName: String,
    hospitalContact: String,
    mediclaimType: String,
    treatmentTypes: String,
    admissionDate: String,
    dischargeDate: String,
    totalExpense: Number,
    documentName: String,
    documentPath: String,
    medicationStatus: {
        type: String,
        default: "Pending"
    },
    requestDate: {
        type: String,
        default: () => new Date().toLocaleDateString("en-GB")
    }
});

const Claim = mongoose.models.Claim || mongoose.model("Claim", claimSchema);

// ✅submit-claim
app.post("/submit-claim", auth, uploadClaim.single("claimDocument"), async (req, res) => {
  try {
   const newClaim = new Claim({
  ...req.body,
  userId: req.userId,
  documentName: req.file ? req.file.originalname : "",
  documentPath: req.file ? req.file.path : ""
});
    await newClaim.save();

    res.json({
      success: true,
      message: "Claim submitted successfully",
      claim: newClaim
    });

  } catch (error) {
    console.error("Claim save error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ✅ get-claim
app.get("/get-claims", auth, async (req, res) => {
  try {
    const claims = await Claim.find({ userId: req.userId })
      .sort({ _id: -1 });

    res.json({
      success: true,
      claims
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      claims: []
    });
  }
});

// ✅ admin-getting all claims 
app.get("/admin/claims", async (req, res) => {
  try {
    const claims = await Claim.find().sort({ _id: -1 });

    res.json({
      success: true,
      claims
    });

    await LoginLog.create({
    name: "Admin",
    role: "Admin",
    action: "Viewed Claims"
  });

  } catch (err) {
    res.status(500).json({ success: false });
  }
});


// ✅ admin-approve claim
app.put("/admin/approve-claim/:id", async (req, res) => {
  try {
    const claim = await Claim.findByIdAndUpdate(
      req.params.id,
      { medicationStatus: "Approved" },
      { new: true }
    );

    res.json({ success: true, claim });

  } catch (err) {
    res.status(500).json({ success: false });
  }
});


// ✅ admin reject-api
app.put("/admin/reject-claim/:id", async (req, res) => {
  try {
    const claim = await Claim.findByIdAndUpdate(
      req.params.id,
      { medicationStatus: "Rejected" },
      { new: true }
    );
    await LoginLog.create({
    name: "Admin",
    role: "Admin",
    action: "Rejected Claim"
  });
    res.json({ success: true, claim });

  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ✅ volunteer section 
const volunteerSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    role: String,
    message: String,
    joinDate: String
});

const Volunteer =
mongoose.models.Volunteer ||
mongoose.model('Volunteer', volunteerSchema);

app.post('/api/volunteers', async (req, res) => {
    try {

        const volunteer = new Volunteer(req.body);

        const savedVolunteer = await volunteer.save();
        res.json({
            success: true,
            message: "Volunteer Saved Successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }
});

// ✅ GET ALL VOLUNTEERS
app.get('/api/volunteers', async (req, res) => {

    try {

        const volunteers = await Volunteer.find()
            .sort({ _id: -1 });

        res.json({
            success: true,
            volunteers
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false
        });

    }

});

app.delete('/api/volunteers/:id', async (req, res) => {

    try {

        const deletedVolunteer =
            await Volunteer.findByIdAndDelete(req.params.id);

        if (!deletedVolunteer) {

            return res.status(404).json({
                success: false,
                message: "Volunteer not found"
            });

        }

        res.json({
            success: true,
            message: "Volunteer deleted successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

});

// ✅ UPDATE VOLUNTEER
app.put('/api/volunteers/:id', async (req, res) => {

    try {

        const updatedVolunteer =
            await Volunteer.findByIdAndUpdate(

                req.params.id,

                {
                    fullName: req.body.name,
                    name: req.body.name,
                    email: req.body.email,
                    phone: req.body.phone,
                    role: req.body.role,
                    joinDate: req.body.joinDate
                },

                { new: true }

            );

        if (!updatedVolunteer) {

            return res.status(404).json({
                success: false,
                message: "Volunteer not found"
            });

        }

        res.json({
            success: true,
            volunteer: updatedVolunteer
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Update failed"
        });

    }

});


// ✅ Donation Schema (ADD HERE)
const DonationSchema = new mongoose.Schema({
  name: String,
  amount: Number,
  donatedAt: {
    type: Date,
    default: Date.now
  }
});

const Donation = mongoose.models.Donation || mongoose.model("Donation", DonationSchema);

// ✅ donation-history 
app.get("/api/payment/donations", async (req, res) => {
  try {
    const donations = await Donation.find().sort({ donatedAt: -1 });

    res.json({
      success: true,
      donations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch donations"
    });
  }
});

const memberSchema = new mongoose.Schema({

    member_id: {
        type: String,
        unique: true
    },

    name: String,

    email: String,

    phone: String,

    role: {
        type: String,
        default: "Member"
    },

    password: String,

    status: {
        type: String,
        default: "active"
    },

    joinDate: String,

    address: String,

    aadharFile: String,

    panFile: String,

    photoFile: String

});

const Member =
mongoose.models.Member ||
mongoose.model(
    'Member',
    memberSchema
);

// GET MEMBERS
app.get('/members', async (req, res) => {

    const members = await Member.find();

    res.json(members);

});

// ADD MEMBER
app.post('/members', async (req, res) => {

    try {

        const member = new Member(req.body);

        await member.save();

        res.json({
            success: true
        });

    } catch(error) {

        res.status(500).json({
            success: false
        });

    }

});

// UPDATE MEMBER
app.put('/members/:id', async (req, res) => {

    try {

        await Member.findByIdAndUpdate(
            req.params.id,
            req.body
        );

        res.json({
            success: true
        });

    } catch(error) {

        res.status(500).json({
            success: false
        });

    }

});

// DELETE MEMBER
app.delete('/members/:id', async (req, res) => {

    try {

        await Member.findByIdAndDelete(
            req.params.id
        );

        res.json({
            success: true
        });

    } catch(error) {

        res.status(500).json({
            success: false
        });

    }

});

// GET SINGLE MEMBER
app.get("/member/:memberId", async (req, res) => {
    try {

        const member = await Member.findOne({
            member_id: req.params.memberId
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }

        res.json({
            success: true,
            member
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
});


// ✅ donations routes
app.get('/donations', async (req, res) => {

    const donations = await Donation.find();

    res.json(donations);

});

app.post('/donations', async (req, res) => {

    const donation = new Donation(req.body);

    await donation.save();

    res.json({
        success: true
    });

});

app.put('/donations/:id', async (req, res) => {

    await Donation.findByIdAndUpdate(
        req.params.id,
        req.body
    );

    res.json({
        success: true
    });

});

app.delete('/donations/:id', async (req, res) => {

    await Donation.findByIdAndDelete(
        req.params.id
    );

    res.json({
        success: true
    });

});

const schemeSchema = new mongoose.Schema({

    name: String,
    description: String,
    budget: String

});

const Scheme =
mongoose.models.Scheme ||
mongoose.model('Scheme', schemeSchema);

// ✅ Schemes routes
app.get('/schemes', async (req, res) => {

    const schemes = await Scheme.find();

    res.json(schemes);

});

app.post('/schemes', async (req, res) => {

    const scheme = new Scheme(req.body);

    await scheme.save();

    res.json({
        success: true
    });

});

app.put('/schemes/:id', async (req, res) => {

    await Scheme.findByIdAndUpdate(
        req.params.id,
        req.body
    );

    res.json({
        success: true
    });

});

app.delete('/schemes/:id', async (req, res) => {

    await Scheme.findByIdAndDelete(
        req.params.id
    );

    res.json({
        success: true
    });

});

const eventSchema = new mongoose.Schema({

    name: String,
    date: String,
    location: String

});

const Event =
mongoose.models.Event ||
mongoose.model(
    'Event',
    eventSchema
);

// ✅ events routes
app.get('/events', async (req, res) => {

    const events = await Event.find();

    res.json(events);

});

app.post('/events', async (req, res) => {

    const event = new Event(req.body);

    await event.save();

    res.json({
        success: true
    });

});

app.put('/events/:id', async (req, res) => {

    await Event.findByIdAndUpdate(
        req.params.id,
        req.body
    );

    res.json({
        success: true
    });

});

app.delete('/events/:id', async (req, res) => {

    await Event.findByIdAndDelete(
        req.params.id
    );

    res.json({
        success: true
    });

});

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  res.status(500).json({
    success: false,
    message: err.message,
    stack: err.stack
  });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });

});


// ✅ Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
