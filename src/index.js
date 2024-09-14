const express = require("express");
const session = require("express-session");
const app = express();
const port = process.env.PORT || 3000;
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const publicDirectory = path.join(__dirname, "../public");
const viewsPath = path.join(__dirname, "../views");

mongoose.connect("mongodb://127.0.0.1:27017/simplechat", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const { User, Message, ChatRoom } = require("./mongodb");

app.set("view engine", "ejs");
app.set("views", viewsPath);
app.use(express.static(publicDirectory));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "your_strong_secret_key_here",
    resave: false,
    saveUninitialized: false,
  })
);

// Routes Configuration

app.get("/chat", async (req, res) => {
  const username = req.session.user ? req.session.user.username : null;
  const profilePicture = req.session.user
    ? await User.findOne({ username: req.session.user.username }).then(
        (user) => user.profileImage
      )
    : null;

  res.render("index", { username, profilePicture });
});

// ==================== Profile Settings ====================

app.get("/profile", (req, res) => {
  const username = req.session.user ? req.session.user.username : null;
  const password = req.session.user ? req.session.user.password : null;
  const user = req.session.user;
  if (!username) {
    return res.redirect("/");
  } else {
    res.render("profile", { username, password });
  }
});

app.post("/profile", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  const userId = req.session.user._id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    const { profilePicture, password } = req.body;

    if (profilePicture) {
      user.profileImage = profilePicture;
    }

    if (password) {
      user.password = password;
    }

    await user.save();

    res.redirect("/chat");
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).send("Error updating profile");
  }
});

// ==================== Chat ====================

app.post("/send-message", async (req, res) => {
  try {
    const { text } = req.body;
    const sender = req.session.user._id;
    const message = new Message({ text, sender });
    await message.save();
    res.status(201).send("Message sent successfully");
  } catch (error) {
    res.status(500).send("Error sending the message");
  }
});

app.get("/get-messages", async (req, res) => {
  try {
    const messages = await Message.find({})
      .populate("sender", "username profileImage")
      .exec();
    res.json(messages);
  } catch (error) {
    res.status(500).send("Error fetching messages");
  }
});

// ==================== Logout ====================

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return console.log(err);
      res.redirect("/chat");
    } else {
      res.clearCookie("connect.sid");
      res.redirect("/");
    }
  });
});

// ==================== Login ====================

app.get("/", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  try {
    const checks = await User.findOne({
      username: req.body.username,
      password: req.body.password,
    });
    if (checks) {
      req.session.user = checks;
      res.redirect("/chat");
    } else {
      res.send("Wrong username or password");
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

// ==================== Sign Up ====================

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  try {
    const checks = await User.findOne({
      username: req.body.username,
    });
    if (checks) {
      res.send("Username already exists");
    } else {
      const data = new User({
        username: req.body.username,
        password: req.body.password,
      });
      await data.save();
      res.redirect("/");
    }
  } catch (error) {
    res.status(500).send(error);
  }
});
// ===============================================

app.listen(port, "127.0.0.1", () => {
  console.log(`Server running on port ${port}`);
});
