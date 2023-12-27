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

app.get("/", (req, res) => res.send("Hello World!"));

app.get("/api/getAllCategories", async (req, res) => {
    const limit = 10000;
    let offset = 0;
    let allCategories = [];
    let emptyCategories = [];

    const bearerToken = req.headers.authorization;

    try {
        while (true) {
            const apiResponse = await axios.get(
                `https://apirest.3dcart.com/3dCartWebAPI/v2/Categories?limit=${limit}&offset=${offset}`,
                {
                    headers: {
                        Authorization: `${bearerToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const categories = apiResponse.data;

            if (categories.length === 0) {
                break;
            }

            allCategories = allCategories.concat(categories);

            offset += limit;

            console.log(`Found ${categories.length} categories`);
        }

        res.json(null);
    } catch (error) {
        // Handle errors, e.g., log the error and send an error response
        if (error.response.status === 404) {

            const subCategories = cleanCategories(allCategories).filter(
                (cat) => cat.CategoryParent !== 0
            );
    
            const leafCategories = new Set();
            for (const subCategory of subCategories) {
                findLeafCategories(subCategory, leafCategories, allCategories);
            }
    
            emptyCategories = Array.from(leafCategories)
                .map((categoryId) => {
                    const category = subCategories.find(
                        (category) => category.CategoryID === categoryId
                    );
                    return category;
                })
                .filter((cat) => cat !== undefined);
    
            console.log(`Found ${emptyCategories.length} empty categories`);

            res.json(emptyCategories);
        } else {
            console.error("Error fetching categories:", error.code);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

function cleanCategories(categories) {
    const counts = {};
    categories.forEach((category) => {
        counts[category.CustomFileName] =
            (counts[category.CustomFileName] || 0) + 1;
    });

    return categories.filter(
        (category) => counts[category.CustomFileName] === 1
    );
}

function findLeafCategories(subCategory, leafCategories, categories) {
    const subList = categories.filter(
        (cat) => cat.CategoryParent === subCategory.CategoryID
    );

    if (subList.length === 0) {
        leafCategories.add(subCategory.CategoryID);
    }

    for (const sub of subList) {
        findLeafCategories(sub, leafCategories, categories);
    }
}

app.get("/api/checkProductsInside/:categoryId", async (req, res) => {
    const bearerToken = req.headers.authorization;
    const categoryId = req.params["categoryId"];

    try {
        const response = await axios.get(`https://apirest.3dcart.com/3dCartWebAPI/v2/Categories/${categoryId}/Products`, {
            headers: {
                Authorization: `${bearerToken}`,
                "Content-Type": "application/json",
            },
        });

        const result = response.data;
        console.log(`Found ${result.length} products in category ${categoryId}`);
        res.json(result.length);
    } catch (error) {
        console.error("Axios error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
