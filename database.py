from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String , Float

du_url = "postgresql://postgres:postgres@localhost:5432/postgres"
engine = create_engine(du_url)

session = sessionmaker(autocommit= False, autoflush= False, bind=engine)


base = declarative_base()

class products(base):

    __tablename__ = "product"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    desc = Column(String)
    price = Column(Float)
    quant = Column(Integer)
