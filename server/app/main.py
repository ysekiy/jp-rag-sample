"""main logics for FastAPI
"""
import json
import os

import boto3
from chain import build_sagemaker_llm_chain, run_chain
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from kendra import KendraIndexRetriever
from langchain.chains import RetrievalQA
from schemas import QueryBody

app = FastAPI()

origins = os.environ["ALLOW_ORIGINS"].split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
REGION = os.environ["AWS_REGION"]
KENDRA_INDEX_ID: str = os.environ["KENDRA_INDEX_ID"]
ENDPOINT_NAME: str = os.environ["SAGEMAKER_ENDPOINT_NAME"]
CHAIN: RetrievalQA = build_sagemaker_llm_chain(
    kendra_index_id=KENDRA_INDEX_ID, endpoint_name=ENDPOINT_NAME, aws_region=REGION
)


@app.get("/")
async def root():
    return {"message": "Hello World"}


retriever = KendraIndexRetriever(
    kendraindex=KENDRA_INDEX_ID, awsregion=REGION, return_source_documents=True
)


@app.post("/v1/query")
async def handle_message(body: QueryBody):
    if body.query_type == "kendra":
        query: str = body.query
        response = retriever.get_relevant_documents(query)
        return {
            "results": [
                {
                    "page_content": doc.page_content,
                    "metadata": doc.metadata,
                }
                for doc in response
            ]
        }
    elif body.query_type == "llm":
        query: str = body.query
        return run_chain(CHAIN, query)
    else:
        raise HTTPException(status_code=404, detail="Invalid query type")
