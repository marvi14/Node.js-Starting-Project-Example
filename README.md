# Command lines for git

* `git init`
* `git remote add origin https://user_name@bitbucket.org/path/git.git`
* `git fetch`
* `git checkout <branchName>`

* `git commit -am "Title of the commit"`
* `git push -u origin master`
* `git pull`


# Code Exercise

In this part, you set up several REST API endpoints:

* `GET /category/id/:id`
* `GET /category/parent/:id`
* `GET /product/id/:id`
* `GET /product/category/:id`
* `PUT /me/cart`
* `GET /me`
* `POST /checkout`
* `GET /product/text/:query`

Which depend on 5 services:

* Category
* Product
* User
* Stripe
* fx
* Mandrill