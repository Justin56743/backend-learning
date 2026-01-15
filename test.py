from fastapi import FastAPI
from pydantic import BaseModel
from typing import Union

app = FastAPI()

class Products(BaseModel):
    id: int
    name: str
    desc: str
    price: float
    quant: int


products= [
    Products(id=1,name="p1",desc="something",price=2.77, quant=10),
    Products(id=2,name="p2",desc="something more",price=2.77, quant=10),
    Products(id=5,name="p3",desc="something more than",price=2.77, quant=10),
    Products(id=9,name="p4",desc="something more than that",price=2.77, quant=10)
]

@app.get("/")
async def homepage():
    return "You are on the Home Page"

@app.get("/products")
async def get_products():
    return products

@app.get("/products/{id}")
async def get_product_by_id(id:int):
    for product in products:
        if product.id == id:
            return product
    return "Product not found"


@app.post("/product")
async def add_a_product(product: Products):
    products.append(product)
    return product

@app.put("/product")
async def update_product(id:int, product: Products):
    for i in range(len(products)):
        if products[i].id == id:
            products[i] = product
            return "Added Successfully"
    return "Not Found"

@app.delete("/products/{id}")
async def del_product(id:int):
    for i in range(len(products)):
        if products[i].id ==id:
            del products[i]
            return "Deleted Successfully"
    return "Not Deleted"
