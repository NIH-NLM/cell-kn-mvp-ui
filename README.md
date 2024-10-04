# Django & React Notes App

### Cloning the repository

Clone the repository using the command below :
```bash
git clone https://github.com/spearw/nlm-cell-site
```

Move into the directory where we have the project files : 
```bash
cd nlm-cell-site
```

Create a virtual environment :
```bash
python -m venv env
```

Activate the virtual environment :
```bash
source env/bin/activate
```

Install requirements:
```bash
pip install -r requirements.txt
```

#

### Running the App

To run the Notes App:
```bash
python manage.py runserver
```

> The development server will be started at http://127.0.0.1:8000/

#

### Updating the App

To update frontend (React):
```bash
cd react
npm run build
```
