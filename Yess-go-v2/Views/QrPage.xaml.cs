using Microsoft.Maui.Controls;
using SkiaSharp;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ZXing;
using ZXing.Common;
using ZXing.Net.Maui;
using PathIO = System.IO.Path; // чтобы избежать конфликта с Android.Graphics.Path

namespace YessGoFront.Views
{
    public partial class QrPage : ContentPage
    {
        private bool _flashOn = false;
        private readonly string _qrFilePath = PathIO.Combine(FileSystem.AppDataDirectory, "my_qr.png");

        public QrPage()
        {
            InitializeComponent();

            BarCodeReader.Options = new BarcodeReaderOptions
            {
                Formats = ZXing.Net.Maui.BarcodeFormat.QrCode,
                AutoRotate = true,
                Multiple = false
            };
        }

        private async void OnExitClicked(object sender, EventArgs e)
        {
            // Возвращаемся на предыдущую страницу в стеке навигации
            await Shell.Current.GoToAsync("///main/partner");
        }



        private async void BarCodeReader_BarcodesDetected(object sender, BarcodeDetectionEventArgs e)
        {
            var first = e.Results?.FirstOrDefault();
            if (first == null)
                return;

            await Dispatcher.DispatchAsync(async () =>
            {
                await DisplayAlert("QR найден", first.Value, "OK");
            });
        }

        private async void OnBackClicked(object sender, EventArgs e)
        {
            await Navigation.PopAsync();
        }

        private void OnFlashClicked(object sender, EventArgs e)
        {
            _flashOn = !_flashOn;
            BarCodeReader.IsTorchOn = _flashOn;
        }

        private async void OnMyQrClicked(object sender, EventArgs e)
        {
            if (!File.Exists(_qrFilePath))
            {
                await GenerateAndSaveMyQrAsync();
            }

            // Показываем окно с QR
            var qrImage = this.FindByName<Image>("QrImage");
            var qrOverlay = this.FindByName<Grid>("QrOverlay");

            qrImage.Source = ImageSource.FromFile(_qrFilePath);
            qrOverlay.IsVisible = true;
        }

        private void OnCloseQrClicked(object sender, EventArgs e)
        {
            var qrOverlay = this.FindByName<Grid>("QrOverlay");
            qrOverlay.IsVisible = false;
        }

        private async Task GenerateAndSaveMyQrAsync()
        {
            try
            {
                string qrData = "YESSGO-" + Guid.NewGuid();

                var writer = new ZXing.BarcodeWriterPixelData
                {
                    Format = ZXing.BarcodeFormat.QR_CODE,
                    Options = new EncodingOptions
                    {
                        Height = 300,
                        Width = 300,
                        Margin = 1
                    }
                };

                var pixelData = writer.Write(qrData);

                using var bitmap = new SKBitmap(pixelData.Width, pixelData.Height);
                var pixels = bitmap.GetPixels();
                System.Runtime.InteropServices.Marshal.Copy(pixelData.Pixels, 0, pixels, pixelData.Pixels.Length);

                using var image = SKImage.FromBitmap(bitmap);
                using var data = image.Encode(SKEncodedImageFormat.Png, 100);
                using var stream = File.OpenWrite(_qrFilePath);
                data.SaveTo(stream);
            }
            catch (Exception ex)
            {
                await DisplayAlert("Ошибка", ex.Message, "OK");
            }
        }
    }
}
