# Backend

## Directory structure

```
api/
    management/
        commands/
    migrations/
    testing/
bin/
config/
profile_pics/
src/
```

### `api/`
Django database API module

#### `api/management/commands/`
* Contains custom Django management commands, including `seed`. See the [seed command guide](..\docs\seed_db.md)

#### `api/migrations/`
* Stores all Django schema migrations. See the [Django migration documentation](https://docs.djangoproject.com/en/6.0/topics/migrations/)

#### `api/testing/`
* API unit tests with pytest. See the [testing documentation](api/testing/README.md)

### `bin/`
Contains a shell script for starting the backend server

### `config/`
Django project configuration files

### `profile_pics/`
Sample user profile pictures for testing

