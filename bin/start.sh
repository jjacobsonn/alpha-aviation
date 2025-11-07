#!/bin/bash

NC='\033[0m' # No Color
BBlue='\033[1;34m'

echo -e "${BBlue}Starting Django server on port 8000...${NC}\n"

poetry install
poetry run python manage.py runserver