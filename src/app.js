import express from "express";
import users from "./database";
import { v4 as uuidv4 } from "uuid";
import { hash, compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import "dotenv/config";

const app = express();
app.use(express.json());

//MIDDLEWARES

const verifyEmailMiddleware = (req, resp, next) => {
  const { email } = req.body;
  const userEmailExist = users.find((user) => user.email === email);

  if (userEmailExist) {
    return resp.status(409).json({ message: "E-mail already registered" });
  }
  next();
};

const authUserMiddleware = (req, resp, next) => {
  let authorization = req.headers.authorization;

  if (!authorization) {
    return resp.status(401).json({
      message: "Missing authorization headers",
    });
  }

  const token = authorization.split(" ")[1];

  return jwt.verify(token, process.env.SECRET_KEY, (error, decoded) => {
    if (error) {
      return [401, { message: "Missing authorization headers" }];
    }
    req.user = {
      isAdm: decoded.isAdm,
      email: decoded.email,
      id: decoded.sub,
    };
    return next();
  });
};

const authAdmMiddleware = (req, resp, next) => {
  if (!req.user.isAdm) {
    return resp.status(403).json({ message: "missing admin permissions" });
  }
  return next();
};

const normalRefreshUsersMiddleware = (req, resp, next) => {
  if (req.params.id !== req.user.id) {
    return next();
  }
  const userDataIndex = users.findIndex(
    (element) => element.uuid === req.params.id
  );
  if (userDataIndex === -1) {
    return resp.status(404).json({ message: "Not found" });
  }
  users[userDataIndex].name = req.body.name;
  users[userDataIndex].email = req.body.email;
  users[userDataIndex].password = req.body.password;
  users[userDataIndex].updatedOn = new Date();
  const newObj = { ...users[userDataIndex] };
  delete newObj.password;

  return resp.status(200).json(newObj);
};

const normalDeleteUsersMiddleware = (req, resp, next) => {
  if (req.params.id !== req.user.id) {
    return next();
  }
  const userDataIndex = users.findIndex(
    (element) => element.uuid === req.params.id
  );
  if (userDataIndex === -1) {
    return resp.status(404).json({ message: "Not found" });
  }
  users.splice(userDataIndex, 1);

  return resp.status(204).json({});
};

//SERVICES

const listUsersService = () => {
  const listUsersResp = users;
  return [200, listUsersResp];
};

const createUserService = async (userData) => {
  const { name, email, password, isAdm } = userData;
  const userNameExist = users.find((user) => user.name === name);

  if (isAdm === undefined) {
    isAdm = false;
  }
  if (!email || !name || !password) {
    const message = "Missing user data";
    return [401, message];
  }
  if (userNameExist) {
    const message = "Name already registered";
    return [409, message];
  }
  const newUser = {
    name,
    email,
    password: await hash(password, 10),
    uuid: uuidv4(),
    createdOn: new Date(),
    updatedOn: new Date(),
    isAdm,
  };
  users.push(newUser);
  const newObj = { ...newUser };
  delete newObj.password;
  delete newObj.password;
  return [201, newObj];
};

const loginUsersService = async ({ email, password }) => {
  const userFound = users.find((user) => user.email === email);
  if (!userFound) {
    return [401, { message: "Wrong email/password" }];
  }
  const passwordMatch = await compare(password, userFound.password);
  if (!passwordMatch) {
    return [401, { message: "Wrong email/password" }];
  }
  const token = jwt.sign(
    {
      email,
      isAdm: userFound.isAdm,
    },
    process.env.SECRET_KEY,
    {
      expiresIn: "24h",
      subject: userFound.uuid,
    }
  );
  return [200, { token: token }];
};

const listProfileService = (userId) => {
  const userData = users.find((element) => element.uuid === userId);
  if (!userData) {
    return [404, { message: "Not found" }];
  }
  const newObj = { ...userData };
  delete newObj.password;
  return [200, newObj];
};

const adminRefreshUsersService = (paramsId, userData) => {
  const userDataIndex = users.findIndex((element) => element.uuid === paramsId);
  if (userDataIndex === -1) {
    return [404, { message: "Not found" }];
  }
  users[userDataIndex].name = userData.name;
  users[userDataIndex].email = userData.email;
  users[userDataIndex].password = userData.password;
  users[userDataIndex].updatedOn = new Date();
  const newObj = { ...users[userDataIndex] };
  delete newObj.password;

  return [200, newObj];
};

const adminDeleteUsersService = (paramsId) => {
  const userDataIndex = users.findIndex((element) => element.uuid === paramsId);
  if (userDataIndex === -1) {
    return [404, { message: "Not found" }];
  }
  users.splice(userDataIndex, 1);
  return [204, {}];
};

//CONTROLLERS

const listUsersController = (req, resp) => {
  const [status, listUsersResp] = listUsersService();
  return resp.status(status).json(listUsersResp);
};

const createUsersController = async (req, resp) => {
  const [status, createUserResp] = await createUserService(req.body);
  return resp.status(status).json(createUserResp);
};

const loginUsersController = async (req, resp) => {
  const [status, loginUsersResp] = await loginUsersService(req.body);
  return resp.status(status).json(loginUsersResp);
};

const listProfileController = (req, resp) => {
  const [status, listProfileResp] = listProfileService(req.user.id);
  return resp.status(status).json(listProfileResp);
};

const adminRefreshUsersControler = (req, resp) => {
  const [status, object] = adminRefreshUsersService(req.params.id, req.body);
  return resp.status(status).json(object);
};

const adminDeleteUsersControler = (req, resp) => {
  const [status, data] = adminDeleteUsersService(req.params.id);
  return resp.status(status).json(data);
};

//ROUTES

app.get("/users", authUserMiddleware, authAdmMiddleware, listUsersController);
app.post("/users", verifyEmailMiddleware, createUsersController);
app.get("/users/profile", authUserMiddleware, listProfileController);
app.post("/login", loginUsersController);
app.patch(
  "/users/:id",
  authUserMiddleware,
  normalRefreshUsersMiddleware,
  authAdmMiddleware,
  adminRefreshUsersControler
);
app.delete(
  "/users/:id",
  authUserMiddleware,
  normalDeleteUsersMiddleware,
  authAdmMiddleware,
  adminDeleteUsersControler
);

const PORT = 3000;

app.listen(PORT, () => {
  console.log("Server running in port 3000");
});

export default app;
