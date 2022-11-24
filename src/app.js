import express from "express";
import users from "./database";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());
//SERVICES

const listUsersService = () => {
  const listUsersResp = users;
  return [200, listUsersResp];
};

const createUserService = (name, email, password) => {
  const userEmailExist = users.find((user) => user.email === email);
  const userNameExist = users.find((user) => user.name === name);

  if (!email || !name || !password) {
    const message = "Missing user data";
    return [400, message];
  }
  if (userEmailExist) {
    const message = "This email is already being used";
    return [400, message];
  }
  if (userNameExist) {
    const message = "This name is already being used";
    return [400, message];
  }
  const newUser = {
    name,
    email,
    password,
    uuid: uuidv4(),
  };
  users.push(newUser);
  return [201, newUser];
};

//CONTROLLERS

app.get("/home", (req, resp) => {
  return resp.send("Opa");
});

const createUsersController = (req, resp) => {
  const { name, email, password } = req.body;
  const [status, createUserResp] = createUserService(name, email, password);
  return resp.status(status).json(createUserResp);
};

const listUsersController = (req, resp) => {
  const [status, listUsersResp] = listUsersService();
  return resp.status(status).json(listUsersResp);
};

//ROUTES

app.get("/users", listUsersController);
app.post("/users", createUsersController);

const PORT = 3001;

app.listen(PORT);

export default app;
