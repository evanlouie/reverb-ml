# ReverbML

Status: Don't even attempt to use. It is currently only on GitHub as my personal backup for development.

## Notes

- As of `"typeorm": "^0.2.7"`, the docs are wrong for lazy loading relations. Even when property type is `Promise<T>` as the docs say, attempting to save the record will fail. (even though their examples says you should be able to do {key: Promise.resolve<T>(value)}) https://github.com/typeorm/typeorm/issues/2276
- Consider migrating `Classification` back into the `Label` table. Although it breaks BCNF, it causes concurrency issues when attempting to spawn multiple labels at once
- Possible race condition if two Labels are attempted to be saved at the exact same time to a Classification which doesn't yet exist. The AudioPlayer `.addLabel` function yields to the creation of the related Classification. If 2 Labels attempt to create the same Classification at the same time within the same transaction frame, they will both see that the Classification as non-existent, try to create it, and one will fail as the `unique` index on Classification name will not allow it. This will most likely not effect people in real life scenarios, and only came about when doing automated DB seeding.
