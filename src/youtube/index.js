/* eslint-disable no-restricted-syntax */
import fs from 'node:fs/promises';
import path from 'path';

const URLS = {
  GET_TOKEN: 'https://oauth2.googleapis.com/token',
  GET_ITEM: 'https://photoslibrary.googleapis.com/v1/mediaItems:search',
  ALBUMS: 'https://photoslibrary.googleapis.com/v1/albums/',
  UPLOADS: 'https://photoslibrary.googleapis.com/v1/uploads',
  CREATE: 'https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate',
};

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN } = process.env;

export async function getToken() {
  const params = new URLSearchParams({
    refresh_token: REFRESH_TOKEN,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'refresh_token',
  });
  const tokenResponse = await fetch(`${URLS.GET_TOKEN}?${params}`, { method: 'POST' });

  if (!tokenResponse.ok) return false;
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) return false;

  return tokenData.access_token;
}

export const getMediaItemIds = async (token, albumId) => {
  const response = await fetch(URLS.GET_ITEM, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ albumId }),
  });

  if (!response.ok) return false;

  const responseData = await response.json();

  if (!responseData.mediaItems) return false;

  return responseData.mediaItems.map((i) => i.id);
};

export async function deleteAllPhotosFromAlbum(token, albumId, mediaItemIds) {
  if (!mediaItemIds || mediaItemIds.length === 0) return false;
  const url = `${URLS.ALBUMS}${albumId}:batchRemoveMediaItems`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mediaItemIds }),
  });

  return response.ok;
}

const getUploadToken = async (photos, headers) => {
  try {
    const tokens = [];

    for await (const photo of photos) {
      const uploadTokenResponse = await fetch(URLS.UPLOADS, { method: 'POST', headers, body: photo });
      const uploadToken = await uploadTokenResponse.text();
      tokens.push(uploadToken);
    }

    return tokens;
  } catch (error) {
    console.log('get upload token error', error);
    return false;
  }
};

const getNewMediaItem = async (uploadTokens, headers) => {
  const newMediaItems = uploadTokens.map((uploadToken) => ({ description: '', simpleMediaItem: { uploadToken } }));
  const newMediaItemsResponse = await fetch(URLS.CREATE, {
    method: 'POST',
    headers,
    body: JSON.stringify({ newMediaItems }),
  });
  const updatedMediaItems = await newMediaItemsResponse.json();

  return updatedMediaItems.newMediaItemResults;
};

const addPhotoToAlbum = async (albumId, headers, mediaItemResults) => {
  try {
    const addToAlbumResponse = await fetch(`${URLS.ALBUMS}${albumId}:batchAddMediaItems`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ mediaItemIds: mediaItemResults.map(({ mediaItem }) => mediaItem.id) }),
    });

    if (!addToAlbumResponse.ok) throw new Error('Adding item error');
  } catch (error) {
    console.log(error);
  }
};

export async function addPhotosToAlbum(token, albumId, photos) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/octet-stream',
  };

  try {
    const uploadTokens = await getUploadToken(photos, headers);
    const mediaItemResults = await getNewMediaItem(uploadTokens, headers);

    await addPhotoToAlbum(albumId, headers, mediaItemResults);
  } catch (error) {
    console.error('Adding items to album error:', error);
  }
  return true;
}

export async function clearFolder(folderPath) {
  try {
    const files = await fs.readdir(folderPath);
    for await (const file of files) await fs.unlink(path.join(folderPath, file));
  } catch (error) {
    console.error('Clear folder error:', error);
  }
}
