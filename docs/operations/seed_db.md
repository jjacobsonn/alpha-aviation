
# Seed Command

This project includes a custom Django management command named `seed` that populates the database with example data. The command is intended for local development and testing.

## What It Does

- Deletes existing rows from all seeded tables.
- Inserts a complete set of sample data across the API models.
- Ensures required relationships are created in the correct order.

Because it clears tables before inserting new rows, it is destructive and should not be used on production data.

## How To Run

From the `backend` directory, run:

```powershell
poetry run python manage.py seed
```

## Looking At Tables With `dbshell`

Django provides a built-in database shell that connects using your `DATABASES` settings.

From the `backend` directory, run:

```powershell
poetry run python manage.py dbshell
```

From there, you can list tables and run SQL queries to inspect the seeded data. 

* `\dt` shows a list of tables in the database
* `select * from [table] (limit [rows]);` shows a specific table and its contents, optionally limiting the number of rows shown

Enter `\q` to quit the database shell