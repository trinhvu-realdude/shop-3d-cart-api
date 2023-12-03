const express = require("express");
const axios = require("axios");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const app = express();
const port = 5000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.disable("x-powered-by");

app.use(morgan("common"));

const apiUrl = "https://apirest.3dcart.com/3dCartWebAPI/v2/Categories";

app.get("/api/categories/:limit", async (req, res) => {
    const bearerToken = req.headers.authorization;
    const limit = req.params["limit"];

    try {
        const response = await axios.get(`${apiUrl}?limit=${limit}&offset=0`, {
            headers: {
                Authorization: `${bearerToken}`,
                "Content-Type": "application/json",
            },
        });

        const categories = response.data;
        res.send(categories);
    } catch (error) {
        console.error("Axios error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/api/products/:categoryId", async (req, res) => {
    const bearerToken = req.headers.authorization;
    const categoryId = req.params["categoryId"];

    try {
        const response = await axios.get(`${apiUrl}/${categoryId}/Products`, {
            headers: {
                Authorization: `${bearerToken}`,
                "Content-Type": "application/json",
            },
        });

        const products = response.data;
        res.send(products);
    } catch (error) {
        console.error("Axios error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.delete("/api/delete/:categoryId", async (req, res) => {
    const bearerToken = req.headers.authorization;
    const categoryId = req.params["categoryId"];

    try {
        const response = await axios.delete(`${apiUrl}/${categoryId}`, {
            headers: {
                Authorization: `${bearerToken}`,
                "Content-Type": "application/json",
            },
        });

        const result = response.data;
        res.send(result);
    } catch (error) {
        console.error("Axios error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
