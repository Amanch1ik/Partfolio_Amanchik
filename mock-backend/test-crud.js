async function run() {
  try {
    console.log('Creating partner...');
    let res = await fetch('http://localhost:4000/api/admin/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Automated Partner', status: 'pending' }),
    });
    const createdPartner = await res.json();
    console.log('Created partner:', JSON.stringify(createdPartner, null, 2));

    console.log('Listing partners...');
    res = await fetch('http://localhost:4000/api/admin/partners');
    const list = await res.json();
    console.log('Partners list:', JSON.stringify(list, null, 2));

    const partnerId = createdPartner?.data?.id || (list?.data?.items && list.data.items[0]?.id) || 1;
    console.log('Using partnerId =', partnerId);

    console.log('Creating product for partner', partnerId);
    res = await fetch(`http://localhost:4000/api/admin/partners/${partnerId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Automated Product', price: 199 }),
    });
    const createdProduct = await res.json();
    console.log('Created product:', JSON.stringify(createdProduct, null, 2));

    console.log('Listing products...');
    res = await fetch(`http://localhost:4000/api/admin/partners/${partnerId}/products`);
    const prods = await res.json();
    console.log('Products list:', JSON.stringify(prods, null, 2));

    console.log('Updating order #1 status to completed...');
    res = await fetch('http://localhost:4000/api/admin/orders/1/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    const updatedOrder = await res.json();
    console.log('Updated order:', JSON.stringify(updatedOrder, null, 2));

    console.log('Done.');
  } catch (e) {
    console.error('Error during CRUD tests:', e);
    process.exit(1);
  }
}

run();


