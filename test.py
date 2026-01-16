from fastapi import FastAPI , Depends
from pydantic import BaseModel
from typing import Union
from database import session, engine
import database
from sqlalchemy.orm import Session

app = FastAPI()

database.base.metadata.create_all(bind=engine)

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


def get_db():
    db = session()
    try:
        yield db
    finally:
        db.close()


def init_dc():
    db= session()
    count = db.query(database.products).count 
    if count == 0 :
        for product in products:
            db.add(database.products(**product.model_dump()))
        db.commit()

init_dc()

@app.get("/")
async def homepage():
    return "You are on the Home Page"

@app.get("/products")
async def get_products(db:Session = Depends(get_db)):
    db_products = db.query(database.products).all()
    return db_products


@app.get("/products/{id}")
async def get_product_by_id(id:int,db:Session = Depends(get_db)):
    db_products = db.query(database.products).filter(database.products.id == id).first()
    
    if db_products:
            return db_products
    return "Product not found"

# @app.get("/products/{id}")
# async def get_product_by_id(id:int):
#     for product in products:
#         if product.id == id:
#             return product
#     return "Product not found"


@app.post("/product")
async def add_a_product(product: Products, db:Session = Depends(get_db)):
    db.add(database.products(**product.model_dump()))
    db.commit()


# @app.post("/product")
# async def add_a_product(product: Products):
#     products.append(product)
#     return product


@app.put("/product")
async def update_product(id:int, product: Products,db:Session = Depends(get_db)):
    db_products = db.query(database.products).filter(database.products.id == id).first()
    if db_products:
        db_products.name = product.name
        db_products.desc = product.desc
        db_products.price = product.price
        db_products.quant = product.quant
        db.commit()
        return "Product Updated"
    else:
        return "No product found"

# @app.put("/product")
# async def update_product(id:int, product: Products):
#     for i in range(len(products)):
#         if products[i].id == id:
#             products[i] = product
#             return "Added Successfully"
#     return "Not Found"

@app.delete("/products/{id}")
async def del_product(id:int):
    for i in range(len(products)):
        if products[i].id ==id:
            del products[i]
            return "Deleted Successfully"
    return "Not Deleted"
