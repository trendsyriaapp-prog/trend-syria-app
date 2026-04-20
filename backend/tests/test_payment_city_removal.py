"""
Test: Payment Methods and City Field Removal
- Verify syriatel_cash and mtn_cash are removed from payment providers
- Verify only shamcash and bank_account are valid payment types
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://127.0.0.1:8001').rstrip('/')


class TestPaymentMethodsRemoval:
    """Test that MTN Cash and Syriatel Cash are removed from payment system"""
    
    def test_payment_v2_status_no_syriatel(self):
        """Verify /api/payment/v2/status does not include syriatel_cash"""
        response = requests.get(f"{BASE_URL}/api/payment/v2/status")
        assert response.status_code == 200
        
        data = response.json()
        providers = data.get("providers", {})
        
        # Should NOT have syriatel_cash
        assert "syriatel_cash" not in providers, "syriatel_cash should be removed from providers"
        
        # Should NOT have mtn_cash
        assert "mtn_cash" not in providers, "mtn_cash should be removed from providers"
        
        # Should have shamcash
        assert "shamcash" in providers, "shamcash should be in providers"
        
        # Should have bank_account
        assert "bank_account" in providers, "bank_account should be in providers"
        
        # Should have bank_card (even if disabled)
        assert "bank_card" in providers, "bank_card should be in providers"
        
        print(f"✅ Payment providers: {list(providers.keys())}")
    
    def test_payment_v2_status_instructions_no_syriatel(self):
        """Verify instructions do not include syriatel_cash"""
        response = requests.get(f"{BASE_URL}/api/payment/v2/status")
        assert response.status_code == 200
        
        data = response.json()
        instructions = data.get("instructions", {})
        
        # Should NOT have syriatel_cash instructions
        assert "syriatel_cash" not in instructions, "syriatel_cash should be removed from instructions"
        
        # Should NOT have mtn_cash instructions
        assert "mtn_cash" not in instructions, "mtn_cash should be removed from instructions"
        
        print(f"✅ Payment instructions: {list(instructions.keys())}")
    
    def test_shamcash_provider_enabled(self):
        """Verify shamcash provider is enabled"""
        response = requests.get(f"{BASE_URL}/api/payment/v2/status")
        assert response.status_code == 200
        
        data = response.json()
        shamcash = data.get("providers", {}).get("shamcash", {})
        
        assert shamcash.get("enabled"), "shamcash should be enabled"
        print(f"✅ Shamcash enabled: {shamcash.get('enabled')}")
    
    def test_bank_account_provider_enabled(self):
        """Verify bank_account provider is enabled"""
        response = requests.get(f"{BASE_URL}/api/payment/v2/status")
        assert response.status_code == 200
        
        data = response.json()
        bank_account = data.get("providers", {}).get("bank_account", {})
        
        assert bank_account.get("enabled"), "bank_account should be enabled"
        print(f"✅ Bank account enabled: {bank_account.get('enabled')}")


class TestSellerPaymentAccountTypes:
    """Test that seller payment account types only allow shamcash and bank_account"""
    
    def test_seller_payment_account_valid_types(self):
        """Verify valid_types in auth.py only includes shamcash and bank_account"""
        # This is a code review test - we verify by checking the file content
        import subprocess
        result = subprocess.run(
            ["grep", "-A", "2", 'valid_types = ', "/app/backend/routes/auth.py"],
            capture_output=True,
            text=True
        )
        
        output = result.stdout
        
        # Should contain shamcash
        assert "shamcash" in output, "shamcash should be in valid_types"
        
        # Should contain bank_account
        assert "bank_account" in output, "bank_account should be in valid_types"
        
        # Should NOT contain syriatel_cash
        assert "syriatel_cash" not in output, "syriatel_cash should NOT be in valid_types"
        
        # Should NOT contain mtn_cash
        assert "mtn_cash" not in output, "mtn_cash should NOT be in valid_types"
        
        print(f"✅ Valid types check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
