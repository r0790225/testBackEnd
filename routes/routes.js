const { path } = require("express/lib/application");
const { mongoose } = require("../models");
const { count } = require("../models/Product");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const nodemailer = require("nodemailer");
var moment = require("moment");

const pageLimit = 9;
module.exports = (app) => {
  const Product = require("../models/Product");
  const User = require("../models/User");
  const Category = require("../models/Category");
  const Order = require("../models/Order");
  const OrderDetail = require("../models/OrderDetail");

  const express = require("express");
  const router = express.Router();
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });
  const getFilters = (filters) => {
    let filter = {};
    idsString = filters["categoryId"] ?? "";
    if (idsString != "") {
      ids = idsString.split("$id[]");
      filter.categoryId = { $in: ids };
    }
    const name = filters["name"] ?? "";
    if (name != "") {
      filter.name = { $regex: name, $options: "i" };
    }
    const stock = filters["stock"] ?? "";
    if (stock != "") {
      if (stock == "0") {
        filter.amountInStock = { $lt: 1 };
      } else if (stock == "1") {
        filter.amountInStock = { $gt: 0 };
      }
    }
    const isActive = filters["isActive"] ?? "";
    if (isActive != "") {
      if (isActive == "0") {
        filter.isActive = { $lt: 1 };
      } else if (isActive == "1") {
        filter.isActive = { $gt: 0 };
      }
    }
    return filter;
  };

  //Everyone
  router.get("/products", async (req, res, next) => {
    const filters = req.query;
    const page = filters["page"] ?? 1;
    const filter = getFilters(filters);
    let products;
    if (filters["sort"] !== undefined) {
      const order = filters["sort"] == "low-high" ? "asc" : "desc";
      await Product.find(filter)
        .limit(pageLimit * 1)
        .skip((page - 1) * pageLimit)
        .sort({ price: order })
        .then((productRes) => (products = productRes))
        .catch((err) => console.log(err));
    } else {
      await Product.find(filter)
        .limit(pageLimit * 1)
        .skip((page - 1) * pageLimit)
        .sort({ price: "asc" })
        .then((productRes) => (products = productRes))
        .catch((err) => console.log(err));
    }
    const count = await Product.find(filter).countDocuments();

    res.json({
      products,
      totalPages: Math.ceil(count / pageLimit),
      currentPage: page,
    });
    next();
  });

  //Everyone
  router.get("/allproductsname", async (req, res, next) => {
    products = await Product.find().select("name");
    const filters = req.query;
    const name = filters["name"] ?? "";
    if (name != "") {
      filter_product = products.filter((p) =>
        p.name.toLowerCase().includes(name.toLowerCase())
      );
    } else {
      filter_product = products;
    }
    res.send(filter_product);
  });

  //Everyone
  router.get("/products/:id", async (req, res) => {
    try {
      const product = await Product.findOne({ _id: req.params.id });
      res.send(product);
    } catch (err) {
      res.send(err.message);
    }
  });

  //Admin
  router.post("/products", authenticateAdmin, async (req, res) => {
    try {
      const product = new Product({
        categoryId: req.body.categoryId,
        name: req.body.name,
        price: req.body.price,
        description: req.body.description,
        isActive: req.body.isActive,
        amountInStock: req.body.amountInStock,
        size: req.body.size,
        color: req.body.color,
        expirationDate: req.body.expirationDate,
        amountProduct: req.body.amountProduct,
        imageUrl: req.body.imageUrl,
      });
      await product.save();
      res.send(product);
    } catch (err) {
      res.send(err.message);
    }
  });
  router.patch("/user/stock", authenticateToken, async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id });
    if (req.body.amountInStock || req.body.amountInStock == 0) {
      product.amountInStock = req.body.amountInStock;
    }
    await product.save();
    res.send(product);
  });

  //Admin
  router.patch("/products/:id", authenticateAdmin, async (req, res) => {
    try {
      const product = await Product.findOne({ _id: req.params.id });

      if (req.body._id) {
        product._id = req.body._id;
      }
      if (req.body.categoryId) {
        product.categoryId = req.body.categoryId;
      }
      if (req.body.name) {
        product.name = req.body.name;
      }
      if (req.body.price || req.body.price == 0) {
        product.price = req.body.price;
      }
      if (req.body.description) {
        product.description = req.body.description;
      }
      if (req.body.isActive) {
        product.isActive = req.body.isActive;
      }
      if (req.body.amountInStock || req.body.amountInStock == 0) {
        product.amountInStock = req.body.amountInStock;
      }
      if (req.body.size) {
        product.size = req.body.size;
      }
      if (req.body.color) {
        product.color = req.body.color;
      }
      if (req.body.expirationDate) {
        product.expirationDate = req.body.expirationDate;
      }
      if (req.body.amountProduct) {
        product.amountProduct = req.body.amountProduct;
      }
      if (req.body.imageUrl) {
        product.imageUrl = req.body.imageUrl;
      }

      await product.save();
      res.send(product);
    } catch (err) {
      res.send(err.message);
    }
  });
  //Admin
  router.delete("/products/:id", authenticateAdmin, async (req, res) => {
    try {
      await Product.deleteOne({ _id: req.params.id });
      res.status(204).send();
    } catch (err) {
      res.status(500).send();
    }
  });
  //Admin
  router.get("/users", authenticateAdmin, async (req, res) => {
    const { page = 1, filters } = req.query;
    try {
      let users;
      User.find({}, function (err, result) {
        if (err) {
          console.log(err);
        } else {
          users = result;
        }
      })
        .limit(pageLimit * 1)
        .skip((page - 1) * pageLimit);

      const count = await User.countDocuments();
      res.json({
        users,
        totalPages: Math.ceil(count / pageLimit),
        currentPage: page,
      });
    } catch (err) {
      res.send(err.message);
    }
  });
  //User personal data request
  router.get("/user", authenticateToken, async (req, res) => {
    try {
      const user = await User.find({ _id: req.user._id });
      res.send(user);
    } catch (err) {
      res.send(err.message);
    }
  });
  //Admin
  router.get("/users/:id", authenticateAdmin, async (req, res) => {
    try {
      const user = await User.find({ _id: req.params.id });
      res.send(user);
    } catch (err) {
      res.send(err.message);
    }
  });
  //Everyone
  router.post("/register", async (req, res) => {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = new User({
        isAdmin: req.body.isAdmin,
        isSuperAdmin: req.body.isSuperAdmin,
        lastName: req.body.lastName,
        firstName: req.body.firstName,
        email: req.body.email,
        password: hashedPassword,
        phoneNr: req.body.phoneNr,
        address1: req.body.address1,
        address2: req.body.address2,
        postalCode: req.body.postalCode,
      });
      await user.save();
      const accessToken = jwt.sign(
        {
          _id: user._id,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          lastName: user.lastName,
          firstName: user.firstName,
          email: user.email,
          password: user.password,
          phoneNr: user.phoneNr,
          address1: user.address1,
          address2: user.address2,
          postalCode: user.postalCode,
        },
        process.env.ACCESS_TOKEN_SECRET
      );
      res.json({ accessToken: accessToken, user: user });
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  //Everyone
  router.post("/login", async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user == null) return res.status(400).send("User does not exist!");
    try {
      if (await bcrypt.compare(req.body.password, user.password)) {
        const accessToken = jwt.sign(
          {
            _id: user._id,
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin,
            lastName: user.lastName,
            firstName: user.firstName,
            email: user.email,
            password: user.password,
            phoneNr: user.phoneNr,
            address1: user.address1,
            address2: user.address2,
            postalCode: user.postalCode,
          },
          process.env.ACCESS_TOKEN_SECRET
        );
        res.json({ accessToken: accessToken, user: user });
      } else {
        res.status(400).send("Password does not match!");
      }
    } catch {
      res.status(500).send();
    }
  });
  //Admin
  router.patch("/users/:id", authenticateAdmin, async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.params.id });

      if (req.body._id) {
        user._id = req.body._id;
      }
      if (req.body.isAdmin != "" && req.body.isAdmin != undefined) {
        if (user.isAdmin != req.body.isAdmin) {
          if (!req.user.isSuperAdmin) {
            return res.sendStatus(403);
          }
          user.isAdmin = req.body.isAdmin;
        }
      }
      if (req.body.isSuperAdmin !== "" && req.body.isSuperAdmin !== undefined) {
        if (user.isSuperAdmin != req.body.isSuperAdmin) {
          if (!req.user.isSuperAdmin) {
            return res.sendStatus(403);
          }
        }
        const adminCount = await User.find({
          isSuperAdmin: true,
        }).countDocuments();
        if (adminCount > 1 || req.body.isSuperAdmin != "false") {
          user.isSuperAdmin = req.body.isSuperAdmin;
        } else if (
          adminCount <= 1 &&
          req.body.isSuperAdmin != "true" &&
          user.isSuperAdmin.toString() != req.body.isSuperAdmin
        ) {
          return res.status(403).send("Can't delete the last super admin!");
        }
      }
      if (req.body.lastName) {
        user.lastName = req.body.lastName;
      }
      if (req.body.firstName) {
        user.firstName = req.body.firstName;
      }
      if (req.body.email) {
        user.email = req.body.email;
      }
      if (req.body.phoneNr) {
        user.phoneNr = req.body.phoneNr;
      }
      if (req.body.address1) {
        user.address1 = req.body.address1;
      }
      if (req.body.address2) {
        user.address2 = req.body.address2;
      }
      if (req.body.postalCode) {
        user.postalCode = req.body.postalCode;
      }

      await user.save();
      res.send(user);
    } catch (err) {
      res.status(500).send();
      console.log(err);
    }
  });
  //User personal edit
  router.patch("/user", authenticateToken, async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.user._id });

      if (req.body._id) {
        user._id = req.body._id;
      }
      if (req.body.isAdmin) {
        user.isAdmin = req.body.isAdmin;
      }
      if (req.body.isSuperAdmin) {
        user.isSuperAdmin = req.body.isSuperAdmin;
      }
      if (req.body.lastName) {
        user.lastName = req.body.lastName;
      }
      if (req.body.firstName) {
        user.firstName = req.body.firstName;
      }
      if (req.body.email) {
        user.email = req.body.email;
      }
      if (req.body.password) {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        user.password = hashedPassword;
      }
      if (req.body.phoneNr) {
        user.phoneNr = req.body.phoneNr;
      }
      if (req.body.address1) {
        user.address1 = req.body.address1;
      }
      if (req.body.address2) {
        user.address2 = req.body.address2;
      }
      if (req.body.postalCode) {
        user.postalCode = req.body.postalCode;
      }

      await user.save();
      res.send(user);
    } catch (err) {
      res.status(500).send(err);
    }
  });
  //Admin
  router.delete("/users/:id", authenticateAdmin, async (req, res) => {
    try {
      await User.deleteOne({ _id: req.params.id });
      res.status(204).send();
    } catch (err) {
      res.status(500).send();
    }
  });

  //Everyone
  router.get("/categories", async (req, res) => {
    const { page = 1, filters } = req.query;

    try {
      const categories = await Category.find()
        .limit(pageLimit * 1)
        .skip((page - 1) * pageLimit);

      const count = await Category.countDocuments();

      res.json({
        categories,
        totalPages: Math.ceil(count / pageLimit),
        currentPage: page,
      });
    } catch (err) {
      res.status(500).send();
    }
  });
  router.get("/headcategories", async (req, res) => {
    try {
      const headCategories = await Category.find({ headCategory: null });
      res.send(headCategories);
    } catch (error) {
      res.sendStatus(500);
    }
  });
  //Everyone
  router.get("/categories/:id", async (req, res) => {
    try {
      const category = await Category.findOne({ _id: req.params.id });

      res.send(category);
    } catch (err) {
      res.status(500).send();
    }
  });
  //Admin
  router.post("/categories", authenticateAdmin, async (req, res) => {
    try {
      const category = new Category({
        category: req.body.category,
        headCategory: req.body.headCategory,
      });
      await category.save();
      res.send(category);
    } catch (err) {
      res.status(500).send();
    }
  });

  //Admin
  router.patch("/categories/:id", authenticateAdmin, async (req, res) => {
    try {
      const category = await Category.findOne({ _id: req.params.id });

      if (req.body.id) {
        category.id = req.body.id;
      }
      if (req.body.category) {
        category.category = req.body.category;
      }
      if (req.body.headCategory) {
        category.headCategory = req.body.headCategory;
      } else {
        category.headCategory = undefined;
      }

      await category.save();
      res.send(category);
    } catch (err) {
      res.status(500).send();
    }
  });

  //Admin
  router.delete("/categories/:id", authenticateAdmin, async (req, res) => {
    try {
      await Category.deleteOne({ _id: req.params.id });
      res.status(204).send();
    } catch (err) {
      res.status(500).send();
    }
  });

  //Admin
  router.get("/orders", authenticateAdmin, async (req, res) => {
    const { page = 1, filters } = req.query;

    try {
      const orders = await Order.find()
        .limit(pageLimit * 1)
        .skip((page - 1) * pageLimit)
        .sort({ date: "desc" });

      const count = await Order.countDocuments();

      res.json({
        orders,
        totalPages: Math.ceil(count / pageLimit),
        currentPage: page,
      });
    } catch (err) {
      res.status(500).send();
    }
  });
  //Admin
  router.get("/orders/:id", authenticateAdmin, async (req, res) => {
    try {
      const order = await Order.find({ _id: req.params.id }).sort({
        date: "desc",
      });

      res.send(order);
    } catch (err) {
      res.send(err.message);
    }
  });
  //Admin
  router.get("/orders/user/:id", authenticateAdmin, async (req, res) => {
    try {
      const order = await Order.findOne({ userId: req.params.id }).sort({
        date: "desc",
      });

      res.send(order);
    } catch (err) {
      res.send(err.message);
    }
  });
  //User get specific order
  router.get("/user/orders/:id", authenticateToken, async (req, res) => {
    try {
      const order = await Order.findOne({ _id: req.params.id }).sort({
        date: "desc",
      });
      if (order.userId != req.user._id)
        return res.status(403).send("Can only access your own orders!");

      res.send(order);
    } catch (err) {
      res.send(err.message);
    }
  });

  //User get personal orders
  router.get("/user/orders", authenticateToken, async (req, res) => {
    try {
      const order = await Order.find({ userId: req.user._id }).sort({
        date: "desc",
      });
      res.send(order);
    } catch (err) {
      res.send(err.message);
    }
  });
  //Logged in users
  router.post("/orders", authenticateToken, async (req, res) => {
    try {
      const order = new Order({
        userId: req.body.userId,
        date: req.body.date,
      });
      await order.save();

      res.send(order);
    } catch (err) {
      res.status(500).send();
    }
  });

  router.post("/sendMail", authenticateToken, async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.body.userId });
      email = user.email;
      user_name = user.firstName;
      formatted_date = moment(req.body.date).format("DD-MM-YYYY");
      let purchases = await OrderDetail.find({ orderId: req.body._id });

      purchased_products = "";
      total_price = 0;
      for (i in purchases) {
        const product = await Product.findOne({ _id: purchases[i].productId });
        purchased_products +=
          purchases[i].amount +
          " - " +
          product.name +
          " (€" +
          product.price +
          "/stuk) voor een totaal van " +
          "€" +
          product.price * purchases[i].amount +
          ".\n";
        total_price += purchases[i].amount * product.price;
      }
      purchased_products += "Totaalprijs: €" + total_price + "\n";

      //Mail service
      const mailOptions = {
        from: "NGLSports",
        to: email,
        subject: "NGLSports Bestelling #" + req.body._id,
        text:
          "Beste " +
          user_name +
          ", \n\nUw order geplaatst op: " +
          formatted_date +
          " is succesvol ontvangen en is in verwerking. \n\nHier zijn uw aangekochte producten:\n" +
          purchased_products +
          "\nBedankt voor uw aankoop! \n\nMet vriendelijke groeten,\nNGLSports",
      };

      transporter.sendMail(mailOptions, function (err, data) {
        if (err) {
          console.log(err);
        } else {
          console.log("Mail sent to: " + email);
        }
      });
      res.status(200).send();
    } catch (err) {
      res.send(err.message);
    }
  });
  //Admin
  router.patch("/orders/:id", authenticateAdmin, async (req, res) => {
    try {
      const order = await Order.findOne({ _id: req.params.id });

      if (req.body.id) {
        order.id = req.body.id;
      }
      if (req.body.userId) {
        order.userId = req.body.userId;
      }
      if (req.body.date) {
        order.date = req.body.date;
      }

      await order.save();
      res.send(order);
    } catch (err) {
      res.status(500).send();
    }
  });
  //Admin
  router.delete("/orders/:id", authenticateAdmin, async (req, res) => {
    try {
      await Order.deleteOne({ _id: req.params.id });
      res.status(204).send();
    } catch (err) {
      res.status(500).send();
    }
  });
  //Admin
  router.get("/orderdetails", authenticateAdmin, async (req, res) => {
    const { page = 1, filters } = req.query;
    try {
      const orderdetails = await OrderDetail.find()
        .limit(pageLimit * 1)
        .skip((page - 1) * pageLimit);

      const count = await OrderDetail.countDocuments();
      res.json({
        orderdetails,
        totalPages: Math.ceil(count / pageLimit),
        currentPage: page,
      });
    } catch (err) {
      res.status(500).send();
    }
  });

  //GET BY ORDERID
  //Admin
  router.get("/orderdetails/:id", authenticateAdmin, async (req, res) => {
    try {
      const orderdetail = await OrderDetail.find({ orderId: req.params.id });
      res.send(orderdetail);
    } catch (err) {
      res.status(500).send();
    }
  });
  //GET BY ORDERID
  //User get personal Order
  router.get("/user/orderdetails/:id", authenticateToken, async (req, res) => {
    try {
      const order = await Order.findOne({ _id: req.params.id });
      if (order.userId != req.user._id)
        return res.status(403).send("Can only access your own orders!");
      const orderdetail = await OrderDetail.find({ orderId: req.params.id });
      res.send(orderdetail);
    } catch (err) {
      res.status(500).send();
    }
  });
  //Logged in users
  router.post("/orderdetails", authenticateToken, async (req, res) => {
    try {
      const orderdetail = new OrderDetail({
        productId: req.body.productId,
        orderId: req.body.orderId,
        amount: req.body.amount,
      });
      await orderdetail.save();
      res.send(orderdetail);
    } catch (err) {
      res.status(500).send();
    }
  });

  //Admin
  router.patch("/orderdetails/:id", authenticateAdmin, async (req, res) => {
    try {
      const orderdetail = await OrderDetail.findOne({ _id: req.params.id });
      if (req.body._id) {
        orderdetail._id = req.body._id;
      }
      if (req.body.productId) {
        orderdetail.productId = req.body.productId;
      }
      if (req.body.orderId) {
        orderdetail.orderId = req.body.orderId;
      }
      if (req.body.amount) {
        orderdetail.amount = req.body.amount;
      }

      await orderdetail.save();
      res.send(orderdetail);
    } catch (err) {
      res.status(500).send();
    }
  });
  //Admin
  router.delete("/orderdetails/:id", authenticateAdmin, async (req, res) => {
    try {
      await Category.deleteMany({ orderId: req.params.id });
      res.status(204).send();
    } catch (err) {
      res.status(500).send();
    }
  });

  //Prefix
  app.use("/api", router);

  module.exports = router;
};
//Authenticate if accessToken is from an admin
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    if (user.isAdmin || user.isSuperAdmin) {
      req.user = user;
      next();
    } else {
      return res.sendStatus(403);
    }
  });
}
//Authenticate if there is an access token - Is logged in
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
