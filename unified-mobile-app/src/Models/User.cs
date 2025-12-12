using System;

namespace YessLoyalty.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public DateTime RegistrationDate { get; set; }
        public string LoyaltyLevel { get; set; }
        public decimal Balance { get; set; }
    }
}
