from fastapi import FastAPI
from typing import Union
from pydantic import BaseModel

app =FastAPI()

class Item(BaseModel):
    name: str
    price: int
    is_offer : Union[bool, None] = None


class Users(BaseModel):
    name: str
    email: str
    password: str
    role: str


@app.get("/")
async def read_root():
    return {'Hello' : 'World'}

@app.get("/items/{item_id}")
async def read_item(item_id :int , q : Union[str,None] = None):
    return {"item_id" : item_id, "q" : q }


@app.put("/items/{item_id}")
async def update_item(item_id:int , item:Item, q:Union[str,None] = None):
    return {"item_name": item.name, "item_id": item_id, "q":q}



@app.post("/api/auth/signup")
async def signin(users:Users):
    return {"user_name": users.name, "user_email": users.email, "user_password": users.password , "user_role": users.role}
    