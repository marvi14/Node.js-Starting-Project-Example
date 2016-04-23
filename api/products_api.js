var bodyparser = require('body-parser');
var express = require('express');
var status = require('http-status');
var _ = require('underscore');

module.exports = function (wagner) {
    var api = express.Router();
    api.use(bodyparser.json());

    api.get('/products', wagner.invoke(function (Product) {
        return function (req, res) {
            Product.find({}, function (error, products) {
                if (error) {
                    return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                }
                if (!products) {
                    return res.status(status.NOT_FOUND).json({ 'error': 'Product not found' });
                } else {
                    return res.json({ 'products': products });
                }
            });
        };
    }));

    api.get('/product/id/:id', wagner.invoke(function (Product) {
        return function (req, res) {
            Product.findOne({ 'name': req.params.id }, function (error, product) {
                if (error) {
                    return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                }
                if (!product) {
                    return res.status(status.NOT_FOUND).json({ 'error': 'Product not found' });
                } else {
                    return res.json({ 'product': product });
                }
            });
        };
    }));

    api.get('/product/category/:id', wagner.invoke(function (Product) {
        return function (req, res) {
            var sort = { 'name': 1 };
            if (req.query.price === "1") {
                sort = { 'internal.approximatePriceUSD': 1 };
            } else if (req.query.price === "-1") {
                sort = { 'internal.approximatePriceUSD': -1 };
            }
            Product.find({ 'category.ancestors': req.params.id }).sort(sort).exec(function (error, products) {
                if (error) {
                    return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                }
                if (!products) {
                    return res.status(status.NOT_FOUND).json({ 'error': 'Product not found' });
                } else {
                    return res.json({ 'products': products });
                }
            });
        };
    }));

    api.get('/product/text/:query', wagner.invoke(function (Product) {
        return function (req, res) {
            Product.find({
                '$text': { '$search': req.params.query }
            }, {
                    score: { '$meta': 'textScore' }
                }).sort({ 'score': { '$meta': 'textScore' } }).limit(10).exec(function (error, products) {
                    if (error) {
                        return res.status(status.INTERNAL_SERVER_ERROR).json({ 'error': error.toString() });
                    }
                    if (!products || products.length == 0) {
                        return res.status(status.NOT_FOUND).json({ 'error': 'No product match this criteria' });
                    } else {
                        return res.json({ 'products': products });
                    }
                });
        };
    }));

    return api;
};