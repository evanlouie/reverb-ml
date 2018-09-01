# ReverbML

Status: Don't even attempt to use. It is currently only on GitHub as my personal backup for development.

## Notes

- As of `"typeorm": "^0.2.7"`, the docs are wrong for lazy relations, property type must be of `T | Promise<T>` not just `Promise<T>` as it says. Doing so will not allow you to set the value properly (even though their examples says you should be able to do {key: Promise.resolve<T>(value)}) https://github.com/typeorm/typeorm/issues/2276
