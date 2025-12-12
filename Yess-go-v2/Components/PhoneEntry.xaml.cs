using System.Linq;
using Microsoft.Maui.Controls;

namespace YessGoFront.Components;

public partial class PhoneEntry : Border
{
    public static readonly BindableProperty PhoneNumberProperty =
        BindableProperty.Create(
            nameof(PhoneNumber),
            typeof(string),
            typeof(PhoneEntry),
            string.Empty,
            BindingMode.TwoWay,
            propertyChanged: OnPhoneNumberChangedExternally);

    public static readonly BindableProperty FullPhoneNumberProperty =
        BindableProperty.Create(
            nameof(FullPhoneNumber),
            typeof(string),
            typeof(PhoneEntry),
            string.Empty,
            BindingMode.TwoWay,
            propertyChanged: OnFullPhoneNumberChangedExternally);

    public string PhoneNumber
    {
        get => (string)GetValue(PhoneNumberProperty);
        set => SetValue(PhoneNumberProperty, value);
    }

    public string FullPhoneNumber
    {
        get => (string)GetValue(FullPhoneNumberProperty);
        set => SetValue(FullPhoneNumberProperty, value);
    }

    public bool IsValid { get; private set; }

    bool _isInternalUpdate;

    public PhoneEntry()
    {
        InitializeComponent();
    }

    void OnPhoneNumberChanged(object sender, TextChangedEventArgs e)
    {
        if (_isInternalUpdate)
            return;

        var raw = e.NewTextValue ?? string.Empty;
        var entry = (Entry)sender;

        var digits = NormalizeDigits(raw);
        var formatted = FormatDigits(digits);

        _isInternalUpdate = true;

        if (PhoneNumber != digits)
            PhoneNumber = digits;

        FullPhoneNumber = string.IsNullOrEmpty(digits)
            ? string.Empty
            : "+996" + digits;

        IsValid = digits.Length == 9;
        ValidationIndicator.IsVisible = IsValid;

        if (entry.Text != formatted)
        {
            entry.Text = string.Empty;
            entry.Text = formatted;
        }


        _isInternalUpdate = false;
    }

    static string NormalizeDigits(string input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        var digits = new string(input.Where(char.IsDigit).ToArray());

        if (digits.Length > 9)
            digits = digits.Substring(0, 9);

        return digits;
    }

    static string FormatDigits(string digits)
    {
        if (string.IsNullOrEmpty(digits))
            return string.Empty;

        if (digits.Length <= 3)
            return digits;

        if (digits.Length <= 6)
            return $"{digits[..3]} {digits[3..]}";

        // 7-9 цифр
        return $"{digits[..3]} {digits[3..6]} {digits[6..]}";
    }

    static void OnPhoneNumberChangedExternally(BindableObject bindable, object oldValue, object newValue)
    {
        if (bindable is not PhoneEntry control || control._isInternalUpdate)
            return;

        control._isInternalUpdate = true;

        var digits = NormalizeDigits(newValue as string ?? string.Empty);
        var formatted = FormatDigits(digits);

        control.PhoneNumberEntryBinding.Text = formatted;

        control.FullPhoneNumber = string.IsNullOrEmpty(digits)
            ? string.Empty
            : "+996" + digits;

        control.IsValid = digits.Length == 9;
        control.ValidationIndicator.IsVisible = control.IsValid;

        control._isInternalUpdate = false;
    }

    static void OnFullPhoneNumberChangedExternally(BindableObject bindable, object oldValue, object newValue)
    {
        if (bindable is not PhoneEntry control || control._isInternalUpdate)
            return;

        control._isInternalUpdate = true;

        var raw = newValue as string ?? string.Empty;
        var digits = NormalizeDigits(raw);
        var formatted = FormatDigits(digits);

        control.PhoneNumber = digits;
        control.PhoneNumberEntryBinding.Text = formatted;

        control.IsValid = digits.Length == 9;
        control.ValidationIndicator.IsVisible = control.IsValid;

        control.FullPhoneNumber = string.IsNullOrEmpty(digits)
            ? string.Empty
            : "+996" + digits;

        control._isInternalUpdate = false;
    }
}

