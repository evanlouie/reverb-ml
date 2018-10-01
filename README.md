# ReverbML

> An Electron app to play, visualize, and annotate your audio files for machine learning

| Operating System | Status                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MacOS            | [![Build Status](https://dev.azure.com/evanlouie/reverb-ml/_apis/build/status/Mac%20Build)](https://dev.azure.com/evanlouie/reverb-ml/_build/latest?definitionId=2)   |
| Linux (Debian)   | [![Build Status](https://dev.azure.com/evanlouie/reverb-ml/_apis/build/status/Linux%20Build)](https://dev.azure.com/evanlouie/reverb-ml/_build/latest?definitionId=1) |
| Windows          | Coming Soon                                                                                                                                                           |

## Quickstart

### Running Development

```bash
yarn install
yarn run start
```

### Building

Make a compiled executable for your current local platform (will generate; ie `.app` for macOS). Output will be to `out` directory.

```bash
yarn install
yarn run package
```

Same as `package` except packages it in a distributable manner for your current local platform; ie `.zip` for macOS or `dep` and `rpm` for Linux. Output will be to `out` directory.

```bash
yarn install
yarn run make
```

## Instructions

- Local database saved to your `~/reverb.sqlite3`.
- Audio samples are saved to `~/reverb-export`.

## Developer Notes

- As of `"typeorm": "^0.2.7"`, the docs are wrong for lazy loading relations. Even when property type is `Promise<T>` as the docs say, attempting to save the record will fail. (even though their examples says you should be able to do {key: Promise.resolve<T>(value)}) https://github.com/typeorm/typeorm/issues/2276
- Consider migrating `Classification` back into the `Label` table. Although it breaks BCNF, it causes concurrency issues when attempting to spawn multiple labels at once
- Possible race condition if two Labels are attempted to be saved at the exact same time to a Classification which doesn't yet exist. The AudioPlayer `.addLabel` function yields to the creation of the related Classification. If 2 Labels attempt to create the same Classification at the same time within the same transaction frame, they will both see that the Classification as non-existent, try to create it, and one will fail as the `unique` index on Classification name will not allow it. This will most likely not effect people in real life scenarios, and only came about when doing automated DB seeding.
- `electron-forge` doesn't play nice with `typeorm`s glob patterns for entity loading as files will not be bundled in the build to import at runtime. Make sure to use the `[<Entity>, <Entity>]` syntax.
- `https://www.tensorflow.org/tutorials/sequences/audio_recognition` doesn't work when WAV files are encoded at 44100. Changing to 16000 seems to fix it.

## Code Style guide

- `.tsx?` files which start with a capital do a named class export of the same filename; other files are considered lib files and can export anything.
- Variables **suffixed** with `_` are of type `Promise<T>` or some unresolved type.

## Special Thanks

- This project is heavily influenced by our sister project https://github.com/ritazh/EchoML/
