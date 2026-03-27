# Project Documentation Guidelines 

---

## Comments 

- Comment at the top of a code file giving a brief overview 

e.g. 
```
“””calculate_numbers.py 
Contains class NumberCalculator that can perform several calculations on two numbers 
“”” 
```
 

- Generally comment on each class or function explaining its parameters, return values, inheritance, and purpose 

    - You don’t have to be 100% thorough explaining every detail. Just imagine the client, who doesn’t know programming well, taking a look at it and wondering, “Why is this function here? What does it do?” Give them enough of an idea to understand what it’s supposed to do 

    - (AI is decent at this if everything is already implemented, but definitely proofread if you use it) 

    e.g. 
    ```
    class NumberCalculator: 
    “”” 
    Calculation class with several methods that take two numerical arguments and return a numerical result 
    “”” 
    ```
 

- Comment on anything particularly complex, as necessary 

- As they say, comment your code as if someone who really hates you is going to read it some day. (At least I think that’s how it goes…) 

---

## Descriptive documents 

- For a collective module or folder that makes up one section, there should be a markdown document explaining the high-level purpose and functionality of the section. These will be continuously updated as changes are made 

    - e.g. in this project, the API module in the backend, the frontend and backend test modules, as well as the frontend and backend directories themselves 

        - Briefly explain tech stacks: backend document would explain that it uses Python, Django, and Pytest, frontend would explain that it uses React.js and jest 

        - Formal API contracts should be with the general project docs, but the backend API module doc should still outline its structure and explain general backend-specific details.  

    - Also, if applicable, include instructions for updating the module and/or adding parts 

    - (AI is pretty good at writing and updating these, just make sure that the formatting is right and it didn’t make up details) 

---

Documentation is everyone’s job: comment your code, and update relevant documents when you make changes.