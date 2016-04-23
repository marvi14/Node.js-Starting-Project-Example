var bodyparser = require('body-parser');
var express = require('express');
var status = require('http-status');
var _ = require('underscore');

module.exports = function (wagner) {
    var api = express.Router();
    api.use(bodyparser.json());

    api.get('/category/id/:id', wagner.invoke(function (Category) {
        return function (req, res) {
            // EN CASO DE NO TENER UN MIDDLEWARE QUE VERIFIQUE AL USUARIO, ESTO LO HARIA
            // if (!req.user) {
            //     return res.
            //         status(status.UNAUTHORIZED).
            //         json({ error: 'Not logged in' });
            // }
            Category.findOne({ '_id': req.params.id }, function (error, category) {
                if (error) {
                    return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                }
                if (!category) {
                    return res.status(status.NOT_FOUND).json({ 'error': 'Category not found' });
                } else {
                    return res.json({ 'category': category });
                }
            });
        };
    }));

    api.get('/category/getChilds/:id', wagner.invoke(function (Category) {
        return function (req, res) {
            Category.find({ 'parent': req.params.id }).sort({ '_id': 1 }).exec(function (error, categories) {
                if (error) {
                    return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                }
                if (!categories) {
                    return res.status(status.NOT_FOUND).json({ 'error': 'No paren categories' });
                } else {
                    return res.json({ 'categories': categories });
                }
            });
        };
    }));

    api.get('/categories', wagner.invoke(function (Category) {
        return function (req, res) {
            Category.find({}, function (error, categories) {
                if (error) {
                    return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                }
                if (!categories) {
                    return res.status(status.NOT_FOUND).json({ 'error': 'Product not found' });
                } else {
                    return res.json({ 'categories': categories });
                }
            });
        };
    }));
    return api;
};