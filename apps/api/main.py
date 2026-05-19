from fastapi import FastAPI

app = FastAPI(title="Soccer Analytics API")

@app.get("/")
def read_root():
    return {"message": "Soccer Analytics API is running!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
