import express from "express";

const app = express();

app.get("/home", (req, resp) => {
  return resp.send("Opa");
});

const PORT = 3001;

app.listen(PORT);

export default app;
