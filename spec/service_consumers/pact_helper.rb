require "pact/provider/rspec"
require "webmock/rspec"
require_relative "../../test/support/organisations_api_test_helper"
require ::File.expand_path("../../config/environment", __dir__)

Pact.configure do |config|
  config.reports_dir = "spec/reports/pacts"
  config.include WebMock::API
  config.include WebMock::Matchers
  config.include OrganisationsApiTestHelper
end

class ProxyApp
  def initialize(real_provider_app)
    @real_provider_app = real_provider_app
  end

  def call(env)
    env["HTTP_HOST"] = "localhost:3002"
    response = @real_provider_app.call(env)
    response
  end
end

def url_encode(str)
  ERB::Util.url_encode(str)
end

Pact.service_provider "Collections Organisation API" do
  app { ProxyApp.new(Rails.application) }
  honours_pact_with "GDS API Adapters" do
    if ENV["USE_LOCAL_PACT"]
      pact_uri ENV.fetch("GDS_API_PACT_PATH", "../gds-api-adapters/spec/pacts/gds_api_adapters-collections_organisation_api.json")
    else
      base_url = ENV.fetch("PACT_BROKER_BASE_URL", "https://pact-broker.cloudapps.digital")
      url = "#{base_url}/pacts/provider/#{url_encode(name)}/consumer/#{url_encode(consumer_name)}"
      version_part = "versions/#{url_encode(ENV.fetch('GDS_API_PACT_VERSION', 'master'))}"

      pact_uri "#{url}/#{version_part}"
    end
  end
end

Pact.provider_states_for "GDS API Adapters" do
  set_up do
    WebMock.enable!
    WebMock.reset!
  end

  tear_down do
    WebMock.disable!
  end

  provider_state "there is a list of organisations" do
    set_up do
      Services
      .search_api
      .stub(:search)
      .with(organisations_params) { search_api_organisations_results }
    end
  end

  provider_state "the organisation list is paginated, beginning at page 1" do
    set_up do
      Services
      .search_api
      .stub(:search)
      .with(organisations_params) { search_api_organisations_two_pages_of_results }
    end
  end

  provider_state "the organisation list is paginated, beginning at page 2" do
    set_up do
      Services
      .search_api
      .stub(:search)
      .with(organisations_params(start: 20)) { search_api_organisations_two_pages_of_results }
    end
  end

  provider_state "the organisation hmrc exists" do
    set_up do
      Services
      .search_api
      .stub(:search)
      .with(
        organisation_params(slug: "hm-revenue-customs"),
      ) { search_api_organisation_results }
    end
  end

  provider_state "no organisation exists" do
    set_up do
      Services
      .search_api
      .stub(:search)
      .with(
        organisation_params(slug: "department-for-making-life-better"),
      ) { search_api_organisation_no_results }
    end
  end
end