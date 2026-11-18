import PostForm from '../PostForm';

export default async function Nouveau({ searchParams }) {
  const type = (await searchParams).type || 'event';
  return (<><h1>Nouveau contenu</h1><PostForm post={{ type, published: true }} /></>);
}
