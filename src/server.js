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

app.get("/api/categories", async (req, res) => {
    const apiUrl =
        "https://apirest.3dcart.com/3dCartWebAPI/v2/Categories?limit=9000000&offset=0";
    const bearerToken = req.headers.authorization;

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `${bearerToken}`,
                "Content-Type": "application/json",
            },
        });

        const categories = response.data;

        const filteredCategoriesList = cleanCategories(categories);

        const subCategories = filteredCategoriesList.filter(
            (cat) => cat.CategoryParent !== 0
        );

        const leafCategories = new Set();
        for (const subCategory of subCategories) {
            findLeafCategories(subCategory, leafCategories, categories);
        }

        const validCategoriesList = new Set();

        let i = 0;

        while (true) {
            try {
                const products = await getProductsByOffset(i, bearerToken);

                products.forEach((product) => {
                    const categoryList = product.CategoryList;

                    categoryList.forEach((category) => {
                        validCategoriesList.add(category.CategoryID);
                    });
                });

                i += 200;
            } catch (error) {
                if (
                    error.response &&
                    Array.isArray(error.response.data) &&
                    error.response.data.length > 0 &&
                    error.response.data[0].Status === "404"
                ) {
                    // Exit the loop when 404 error occurs
                    console.error("Error :", error.response.data[0].Message);
                    break;
                } else {
                    // Handle other errors if needed
                    console.error("An error occurred:", error);
                    break; // You might want to break in other error cases too
                }
            }
        }

        const emptyCategoryIds = Array.from(leafCategories).filter(
            (categoryId) => !validCategoriesList.has(categoryId)
        );

        const finalResult = Array.from(emptyCategoryIds)
            .map((categoryId) => {
                const category = subCategories.find(
                    (category) => category.CategoryID === categoryId
                );
                return category;
            })
            .filter((cat) => cat !== undefined);

        res.json(finalResult);
    } catch (error) {
        console.error("Axios error:", error);
        res.status(500).send("Internal Server Error");
    }
});

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

async function getProductsByOffset(offset, bearerToken) {
    const apiUrl = `https://apirest.3dcart.com/3dCartWebAPI/v2/Products?limit=200&offset=${offset}`;
    
    console.log(`Fetching /3dCartWebAPI/v2/Products?limit=200&offset=${offset}`);

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `${bearerToken}`,
                "Content-Type": "application/json",
            },
        });

        const products = response.data;
        return products;
    } catch (error) {
        console.error("Axios error:", error);
        res.status(500).send("Internal Server Error");
    }
}

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
