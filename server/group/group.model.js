let Model = require('../models-master');
let responseJSON = require('../response');
let async = require('async');

async function createNewGroup(data, done, username) {
    let user = await Model.User.findOne({where: {username: username}});
    Model.Group.create(data).then(group => {
        group.addUser(user, {through: {permission: 1}});
        done(responseJSON(200, "Successfull", group));
    }).catch(err => {
        done(responseJSON(512, err, err));
    });
}

async function listGroup(data, done, username) {
    let user = await Model.User.findOne({where: {username: username}});
    Model.Group.findAll({include: [{model: Model.User}, {model: Model.SharedProject}]}).then(groups => {
        let response = [];
        async.each(groups, function (group, nextGroup) {
            group = group.toJSON();
            group.canDelete = false;
            // group.canEdit = false;
            let arr = [];
            async.each(group.shared_projects, function (shared_project, next) {
                if (shared_project.idOwner === user.idUser) {
                    arr.push(shared_project);
                    next();
                } else {
                    next();
                }
            }, function () {
                async.each(group.users, function (_user, nextUser) {
                    if (_user.user_group_permission.permission === 1 && _user.idUser === user.idUser) group.canDelete = true;
                    nextUser();
                }, function () {
                    group.shared_projects = arr;
                    response.push(group);
                    nextGroup();
                });
            });
        }, function () {
            done(responseJSON(200, "Successfull", response));
        });
    }).catch(err => {
        done(responseJSON(512, err, err));
    });
}

function addUserToGroup(data, done) {
    Model.Group.findById(data.idGroup).then(group => {
        if (group) {
            group.addUser(data.idUser, {through: {permission: 2}});
            done(responseJSON(200, "Successfull", data));
        } else {
            done(responseJSON(512, "No group found by id"));
        }
    }).catch(err => {
        done(responseJSON(512, err, err));
    });
}

function deleteGroup(data, done) {
    Model.Group.findById(data.idGroup).then(group => {
        if (group) {
            group.destroy().then(() => {
                done(responseJSON(200, "Successfull", group));
            })
        } else {
            done(responseJSON(512, "No group found by id"));
        }
    }).catch(err => {
        done(responseJSON(512, err, err));
    });
}

function removeUser(data, done) {
    Model.Group.findById(data.idGroup, {include: {model: Model.User, where: {idUser: data.idUser}}}).then(group => {
        if (group) {
            if (group.users[0].user_group_permission.permission === 1) {
                done(responseJSON(200, "CANT_REMOVE_OWNER", "CANT_REMOVE_OWNER"));
            } else {
                group.removeUser(data.idUser);
                done(responseJSON(200, "Successfull", data));
            }
        } else {
            done(responseJSON(512, "No group found by id"));
        }
    });
}

module.exports = {
    createNewGroup: createNewGroup,
    listGroup: listGroup,
    deleteGroup: deleteGroup,
    addUserToGroup: addUserToGroup,
    removeUser: removeUser
};