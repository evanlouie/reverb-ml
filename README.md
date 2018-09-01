# ReverbML

Status: Don't even attempt to use. It is currently only on GitHub as my personal backup for development.

## Notes

- As of `"typeorm": "^0.2.7"`, the docs are wrong for lazy loading relations. Even when property type is `Promise<T>` as the docs say, attempting to save the record will fail. (even though their examples says you should be able to do {key: Promise.resolve<T>(value)}) https://github.com/typeorm/typeorm/issues/2276
- Consider migrating `Classification` back into the `Label` table. Although it is 1NF, it causes concurrency issues when attempting to spawn multiple labels at once
