/* eslint-disable no-restricted-syntax */

import { addPhotosToAlbum, deleteAllPhotosFromAlbum, getMediaItemIds, getToken } from './youtube';
import shotPage from './wallpaper';

try {
  const token = await getToken();
  const { ALBUM_ID } = process.env;

  if (!token) {
    console.log('token error!');
    process.exit();
  }

  const photos = [];

  for await (const id of [1, 2, 3]) {
    const screenshot = await shotPage(id);
    photos.push(screenshot);
  }

  const oldPhotos = await getMediaItemIds(token, ALBUM_ID);

  await addPhotosToAlbum(token, ALBUM_ID, photos);
  await deleteAllPhotosFromAlbum(token, ALBUM_ID, oldPhotos);
} catch (error) {
  console.error('Произошла ошибка:', error.response ?? error);
}
